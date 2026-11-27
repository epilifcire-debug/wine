-- Regressão da v1.11.0: renovação antecipada deixava o aluno sem contrato válido até o
-- início da renovação. O pagamento cancelava (e encurtava) o contrato atual e a checagem
-- de reserva só olhava o contrato mais recente.

-- 1) Pagamento: na renovação antecipada do mesmo plano, o contrato atual segue até o fim.
CREATE OR REPLACE FUNCTION public.registrar_pagamento_presencial(p_aluno_plano_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_contrato public.aluno_planos%ROWTYPE;
  v_plano public.planos%ROWTYPE;
  v_user_id uuid;
  v_inicio date;
  v_vencimento date;
  v_pagamento_id uuid;
  v_vencimento_atual date;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF NOT private.is_admin() THEN RAISE EXCEPTION 'NOT_AUTHORIZED: Apenas administradores podem confirmar pagamentos.'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('pagamento-plano:' || p_aluno_plano_id::text, 0));
  SELECT * INTO v_contrato FROM public.aluno_planos WHERE id = p_aluno_plano_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PLAN_CONTRACT_NOT_FOUND'; END IF;
  IF v_contrato.status <> 'aguardando_pagamento' THEN
    IF EXISTS (SELECT 1 FROM public.pagamentos p WHERE p.aluno_plano_id = p_aluno_plano_id AND p.status = 'pago') THEN
      RAISE EXCEPTION 'PAYMENT_ALREADY_REGISTERED';
    END IF;
    RAISE EXCEPTION 'PAYMENT_NOT_PENDING';
  END IF;
  SELECT * INTO v_plano FROM public.planos WHERE id = v_contrato.plano_id;
  IF NOT FOUND OR v_plano.ativo IS DISTINCT FROM true THEN RAISE EXCEPTION 'PLAN_NOT_AVAILABLE'; END IF;
  IF EXISTS (SELECT 1 FROM public.pagamentos p WHERE p.aluno_plano_id = p_aluno_plano_id AND p.status = 'pago') THEN
    RAISE EXCEPTION 'PAYMENT_ALREADY_REGISTERED';
  END IF;
  SELECT a.user_id INTO v_user_id FROM public.alunos a WHERE a.id = v_contrato.aluno_id FOR UPDATE;
  SELECT max(COALESCE(ap.proximo_vencimento, ap.data_fim)) INTO v_vencimento_atual
  FROM public.aluno_planos ap WHERE ap.aluno_id = v_contrato.aluno_id
    AND ap.status IN ('ativo', 'proximo_vencimento') AND ap.plano_id = v_contrato.plano_id AND ap.id <> v_contrato.id;
  v_inicio := GREATEST(public.hoje_brasilia(), COALESCE(v_vencimento_atual, public.hoje_brasilia()));
  v_vencimento := (v_inicio + (GREATEST(COALESCE(v_plano.duracao_meses, 1), 1) || ' months')::interval)::date;
  -- Renovação antecipada do mesmo plano: o contrato atual continua valendo até o fim
  -- (a renovação começa no vencimento dele). Só encerra contratos de outro plano ou já vencidos.
  UPDATE public.aluno_planos
     SET status = 'cancelado',
         data_fim = LEAST(COALESCE(data_fim, public.hoje_brasilia()), public.hoje_brasilia())
   WHERE aluno_id = v_contrato.aluno_id AND id <> v_contrato.id
     AND status IN ('ativo', 'proximo_vencimento', 'vencido')
     AND NOT (
       plano_id = v_contrato.plano_id
       AND COALESCE(proximo_vencimento, data_fim) >= public.hoje_brasilia()
       AND v_inicio > public.hoje_brasilia()
     );
  UPDATE public.aluno_planos SET status = 'ativo', data_inicio = v_inicio, data_fim = v_vencimento,
    proximo_vencimento = v_vencimento, observacao = 'Pagamento presencial confirmado' WHERE id = v_contrato.id;
  INSERT INTO public.pagamentos (aluno_id, user_id, plano_id, aluno_plano_id, valor_centavos,
    forma_pagamento, origem, status, pago_em, registrado_por, provedor, id_externo, chave_idempotencia)
  VALUES (v_contrato.aluno_id, v_user_id, v_contrato.plano_id, v_contrato.id,
    v_contrato.valor_centavos, 'presencial', 'manual', 'pago', now(), auth.uid(), NULL, NULL,
    'mensalidade:' || v_contrato.id::text) RETURNING id INTO v_pagamento_id;
  UPDATE public.alunos SET plano_id = v_contrato.plano_id WHERE id = v_contrato.aluno_id;
  RETURN v_pagamento_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.registrar_pagamento_presencial(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_pagamento_presencial(uuid) TO authenticated;

-- 2) Reserva: usa o contrato que cobre a data da aula.
CREATE OR REPLACE FUNCTION public.check_limite_semanal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $function$
DECLARE
  v_plano public.planos%ROWTYPE;
  v_plano_id uuid;
  v_data date; v_modalidade uuid; v_ini date; v_ini_mes date; v_dow smallint;
  v_count integer; v_venc date; v_inicio date;
  v_day_use uuid; v_plano_ok boolean := false; v_contrato_ok boolean := false;
  v_motivo text;
BEGIN
  IF NEW.status <> 'confirmada' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'confirmada' THEN RETURN NEW; END IF;

  SELECT h.data, h.modalidade_id INTO v_data, v_modalidade
  FROM public.horarios h WHERE h.id = NEW.horario_id;
  v_data := COALESCE(v_data, public.hoje_brasilia());
  v_dow := extract(isodow FROM v_data)::smallint;
  v_ini := date_trunc('week', v_data::timestamp)::date;
  v_ini_mes := date_trunc('month', v_data::timestamp)::date;

  -- Ordem fixa (mês, depois semana) para não travar entre duas reservas simultâneas.
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.aluno_id::text || ':m:' || v_ini_mes::text, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.aluno_id::text || ':' || v_ini::text, 0));

  SELECT a.plano_id INTO v_plano_id FROM public.alunos a WHERE a.id = NEW.aluno_id;
  IF v_plano_id IS NOT NULL THEN
    SELECT * INTO v_plano FROM public.planos p WHERE p.id = v_plano_id;
    SELECT COALESCE(ap.proximo_vencimento, ap.data_fim), ap.data_inicio INTO v_venc, v_inicio
    FROM public.aluno_planos ap
    WHERE ap.aluno_id = NEW.aluno_id AND ap.plano_id = v_plano_id
      AND ap.status IN ('ativo', 'proximo_vencimento', 'vencido')
    -- Prefere o contrato que cobre a data da aula (renovação antecipada tem dois contratos).
    ORDER BY (COALESCE(ap.data_inicio, '-infinity'::date) <= v_data
              AND COALESCE(ap.proximo_vencimento, ap.data_fim) >= v_data) DESC,
             ap.data_inicio DESC NULLS LAST, ap.created_at DESC LIMIT 1;
    v_contrato_ok := FOUND;

    IF v_plano.ativo IS true AND v_contrato_ok AND v_venc IS NOT NULL
       AND v_venc >= v_data AND (v_inicio IS NULL OR v_inicio <= v_data) THEN
      IF v_dow = ANY (COALESCE(v_plano.dias_acesso_livre, '{}'))
         AND NOT (v_dow = ANY (COALESCE(v_plano.dias_permitidos, '{}'))) THEN
        v_motivo := 'FREE';
      ELSIF cardinality(v_plano.dias_permitidos) > 0
         AND NOT (v_dow = ANY (v_plano.dias_permitidos)) THEN
        v_motivo := 'DAY';
      ELSIF cardinality(v_plano.modalidades_permitidas) > 0
         AND NOT (v_modalidade = ANY (v_plano.modalidades_permitidas)) THEN
        v_motivo := 'CLASS';
      ELSIF v_plano.ilimitado THEN
        v_plano_ok := true;
      ELSE
        IF v_plano.limite_semanal IS NOT NULL THEN
          SELECT count(*) INTO v_count
          FROM public.reservas r JOIN public.horarios h ON h.id = r.horario_id
          WHERE r.aluno_id = NEW.aluno_id AND r.status = 'confirmada' AND r.id <> NEW.id
            AND h.cancelada = false AND h.data >= v_ini AND h.data < v_ini + 7
            AND NOT EXISTS (SELECT 1 FROM public.day_uses d WHERE d.reserva_id = r.id);
          IF v_count >= v_plano.limite_semanal THEN v_motivo := 'WEEK'; END IF;
        END IF;
        IF v_motivo IS NULL AND v_plano.limite_mensal IS NOT NULL THEN
          SELECT count(*) INTO v_count
          FROM public.reservas r JOIN public.horarios h ON h.id = r.horario_id
          WHERE r.aluno_id = NEW.aluno_id AND r.status = 'confirmada' AND r.id <> NEW.id
            AND h.cancelada = false AND h.data >= v_ini_mes
            AND h.data < (v_ini_mes + interval '1 month')::date
            AND NOT EXISTS (SELECT 1 FROM public.day_uses d WHERE d.reserva_id = r.id);
          IF v_count >= v_plano.limite_mensal THEN v_motivo := 'MONTH'; END IF;
        END IF;
        IF v_motivo IS NULL THEN v_plano_ok := true; END IF;
      END IF;
    END IF;
  END IF;

  IF v_plano_ok THEN RETURN NEW; END IF;

  -- Fora da regra do plano: um Day Use disponível ainda libera a aula.
  UPDATE public.day_uses d SET status = 'vencido'
  WHERE d.aluno_id = NEW.aluno_id AND d.status = 'disponivel'
    AND d.validade IS NOT NULL AND d.validade < public.hoje_brasilia();
  SELECT d.id INTO v_day_use FROM public.day_uses d
  WHERE d.aluno_id = NEW.aluno_id AND d.status = 'disponivel'
    AND (d.validade IS NULL OR d.validade >= v_data)
  ORDER BY d.validade NULLS LAST, d.created_at LIMIT 1 FOR UPDATE;
  IF v_day_use IS NOT NULL THEN
    UPDATE public.day_uses SET status = 'reservado', reserva_id = NEW.id, utilizado_em = now() WHERE id = v_day_use;
    RETURN NEW;
  END IF;

  IF v_plano_id IS NULL OR v_plano.ativo IS DISTINCT FROM true OR NOT v_contrato_ok THEN
    RAISE EXCEPTION 'NO_ACTIVE_PLAN: Você ainda não possui um plano ativo. Escolha um plano ou compre um Day Use para reservar sua aula.';
  END IF;
  IF v_venc IS NULL OR v_venc < v_data THEN
    RAISE EXCEPTION 'PLAN_EXPIRED: Seu plano vence antes da data desta aula. Renove seu plano para reservar.';
  END IF;
  IF v_inicio IS NOT NULL AND v_inicio > v_data THEN
    RAISE EXCEPTION 'PLAN_NOT_STARTED: Seu plano ainda não começou na data desta aula.';
  END IF;
  IF v_motivo = 'FREE' THEN
    RAISE EXCEPTION 'PLAN_FREE_ACCESS_DAY: Neste dia seu plano tem acesso livre para treino de força, sem reserva de aula.';
  END IF;
  IF v_motivo = 'DAY' THEN
    RAISE EXCEPTION 'PLAN_DAY_NOT_ALLOWED: Seu plano não libera aulas neste dia da semana.';
  END IF;
  IF v_motivo = 'CLASS' THEN
    RAISE EXCEPTION 'PLAN_CLASS_NOT_ALLOWED: Seu plano não libera esta turma.';
  END IF;
  IF v_motivo = 'MONTH' THEN
    RAISE EXCEPTION 'MONTHLY_PLAN_LIMIT_REACHED: Seu plano permite até % aula(s) por mês. Para realizar mais aulas, faça upgrade do seu plano ou compre um Day Use.', v_plano.limite_mensal;
  END IF;
  RAISE EXCEPTION 'WEEKLY_PLAN_LIMIT_REACHED: Seu plano permite até % aula(s) por semana. Para realizar mais aulas, faça upgrade do seu plano ou compre um Day Use.', v_plano.limite_semanal;
END;
$function$;
REVOKE ALL ON FUNCTION public.check_limite_semanal() FROM PUBLIC, anon, authenticated;

-- 3) Reparo: contratos encerrados por renovação antecipada voltam a valer até o vencimento
--    original, que é exatamente o início da renovação.
UPDATE public.aluno_planos antigo
   SET status = 'ativo',
       data_fim = antigo.proximo_vencimento
  FROM public.aluno_planos novo
 WHERE antigo.status = 'cancelado'
   AND novo.aluno_id = antigo.aluno_id
   AND novo.plano_id = antigo.plano_id
   AND novo.id <> antigo.id
   AND novo.status IN ('ativo', 'proximo_vencimento')
   AND antigo.proximo_vencimento IS NOT NULL
   AND novo.data_inicio = antigo.proximo_vencimento
   AND antigo.proximo_vencimento >= public.hoje_brasilia();
