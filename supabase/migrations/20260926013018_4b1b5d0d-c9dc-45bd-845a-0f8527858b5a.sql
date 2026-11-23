CREATE OR REPLACE FUNCTION public.check_limite_semanal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $function$
DECLARE
  v_plano_id uuid; v_ativo boolean; v_limite integer;
  v_data date; v_ini date; v_count integer; v_venc date;
  v_day_use uuid; v_plano_ok boolean := false; v_contrato_ok boolean := false;
BEGIN
  IF NEW.status <> 'confirmada' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'confirmada' THEN RETURN NEW; END IF;
  SELECT h.data INTO v_data FROM public.horarios h WHERE h.id = NEW.horario_id;
  v_ini := date_trunc('week', COALESCE(v_data, CURRENT_DATE)::timestamp)::date;
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.aluno_id::text || ':' || v_ini::text, 0));
  SELECT a.plano_id INTO v_plano_id FROM public.alunos a WHERE a.id = NEW.aluno_id;
  IF v_plano_id IS NOT NULL THEN
    SELECT p.limite_semanal, p.ativo INTO v_limite, v_ativo FROM public.planos p WHERE p.id = v_plano_id;
    SELECT COALESCE(ap.proximo_vencimento, ap.data_fim) INTO v_venc
    FROM public.aluno_planos ap
    WHERE ap.aluno_id = NEW.aluno_id AND ap.plano_id = v_plano_id
      AND ap.status IN ('ativo', 'proximo_vencimento', 'vencido')
    ORDER BY ap.data_inicio DESC NULLS LAST, ap.created_at DESC LIMIT 1;
    v_contrato_ok := FOUND;
    IF v_ativo IS true AND v_contrato_ok AND v_venc IS NOT NULL AND v_venc >= CURRENT_DATE THEN
      IF v_limite IS NULL THEN
        v_plano_ok := true;
      ELSE
        SELECT count(*) INTO v_count
        FROM public.reservas r JOIN public.horarios h ON h.id = r.horario_id
        WHERE r.aluno_id = NEW.aluno_id AND r.status = 'confirmada' AND r.id <> NEW.id
          AND h.cancelada = false AND h.data >= v_ini AND h.data < v_ini + 7
          AND NOT EXISTS (SELECT 1 FROM public.day_uses d WHERE d.reserva_id = r.id);
        IF v_count < v_limite THEN v_plano_ok := true; END IF;
      END IF;
    END IF;
  END IF;
  IF v_plano_ok THEN RETURN NEW; END IF;
  UPDATE public.day_uses d SET status = 'vencido'
  WHERE d.aluno_id = NEW.aluno_id AND d.status = 'disponivel'
    AND d.validade IS NOT NULL AND d.validade < CURRENT_DATE;
  SELECT d.id INTO v_day_use FROM public.day_uses d
  WHERE d.aluno_id = NEW.aluno_id AND d.status = 'disponivel'
  ORDER BY d.validade NULLS LAST, d.created_at LIMIT 1 FOR UPDATE;
  IF v_day_use IS NOT NULL THEN
    UPDATE public.day_uses SET status = 'reservado', reserva_id = NEW.id, utilizado_em = now() WHERE id = v_day_use;
    RETURN NEW;
  END IF;
  IF v_plano_id IS NULL OR v_ativo IS DISTINCT FROM true OR NOT v_contrato_ok THEN
    RAISE EXCEPTION 'NO_ACTIVE_PLAN: Você ainda não possui um plano ativo. Escolha um plano ou compre um Day Use para reservar sua aula.';
  END IF;
  IF v_venc IS NULL OR v_venc < CURRENT_DATE THEN
    RAISE EXCEPTION 'PLAN_EXPIRED: Seu plano está vencido. Renove seu plano para voltar a reservar aulas.';
  END IF;
  RAISE EXCEPTION 'WEEKLY_PLAN_LIMIT_REACHED: Seu plano permite até % aula(s) por semana. Para realizar mais aulas, faça upgrade do seu plano ou compre um Day Use.', v_limite;
END;
$function$;

CREATE OR REPLACE FUNCTION public.registrar_pagamento_presencial(p_aluno_plano_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
  v_inicio := GREATEST(CURRENT_DATE, COALESCE(v_vencimento_atual, CURRENT_DATE));
  v_vencimento := (v_inicio + (GREATEST(COALESCE(v_plano.duracao_meses, 1), 1) || ' months')::interval)::date;
  UPDATE public.aluno_planos SET status = 'cancelado', data_fim = LEAST(COALESCE(data_fim, CURRENT_DATE), CURRENT_DATE)
  WHERE aluno_id = v_contrato.aluno_id AND id <> v_contrato.id AND status IN ('ativo', 'proximo_vencimento', 'vencido');
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
$$;
REVOKE ALL ON FUNCTION public.registrar_pagamento_presencial(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_pagamento_presencial(uuid) TO authenticated;