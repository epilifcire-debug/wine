-- Dias de acesso livre: o aluno usa o espaço (ex.: treino de força no sábado),
-- mas não reserva aulas nesses dias. Ex.: Flagship = aulas seg-qui + acesso livre sáb.
ALTER TABLE public.planos ADD COLUMN IF NOT EXISTS dias_acesso_livre smallint[];

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
  v_count integer; v_venc date;
  v_day_use uuid; v_plano_ok boolean := false; v_contrato_ok boolean := false;
  v_motivo text;
BEGIN
  IF NEW.status <> 'confirmada' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'confirmada' THEN RETURN NEW; END IF;

  SELECT h.data, h.modalidade_id INTO v_data, v_modalidade
  FROM public.horarios h WHERE h.id = NEW.horario_id;
  v_data := COALESCE(v_data, CURRENT_DATE);
  v_dow := extract(isodow FROM v_data)::smallint;
  v_ini := date_trunc('week', v_data::timestamp)::date;
  v_ini_mes := date_trunc('month', v_data::timestamp)::date;
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.aluno_id::text || ':' || v_ini::text, 0));

  SELECT a.plano_id INTO v_plano_id FROM public.alunos a WHERE a.id = NEW.aluno_id;
  IF v_plano_id IS NOT NULL THEN
    SELECT * INTO v_plano FROM public.planos p WHERE p.id = v_plano_id;
    SELECT COALESCE(ap.proximo_vencimento, ap.data_fim) INTO v_venc
    FROM public.aluno_planos ap
    WHERE ap.aluno_id = NEW.aluno_id AND ap.plano_id = v_plano_id
      AND ap.status IN ('ativo', 'proximo_vencimento', 'vencido')
    ORDER BY ap.data_inicio DESC NULLS LAST, ap.created_at DESC LIMIT 1;
    v_contrato_ok := FOUND;

    IF v_plano.ativo IS true AND v_contrato_ok AND v_venc IS NOT NULL AND v_venc >= CURRENT_DATE THEN
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
    AND d.validade IS NOT NULL AND d.validade < CURRENT_DATE;
  SELECT d.id INTO v_day_use FROM public.day_uses d
  WHERE d.aluno_id = NEW.aluno_id AND d.status = 'disponivel'
  ORDER BY d.validade NULLS LAST, d.created_at LIMIT 1 FOR UPDATE;
  IF v_day_use IS NOT NULL THEN
    UPDATE public.day_uses SET status = 'reservado', reserva_id = NEW.id, utilizado_em = now() WHERE id = v_day_use;
    RETURN NEW;
  END IF;

  IF v_plano_id IS NULL OR v_plano.ativo IS DISTINCT FROM true OR NOT v_contrato_ok THEN
    RAISE EXCEPTION 'NO_ACTIVE_PLAN: Você ainda não possui um plano ativo. Escolha um plano ou compre um Day Use para reservar sua aula.';
  END IF;
  IF v_venc IS NULL OR v_venc < CURRENT_DATE THEN
    RAISE EXCEPTION 'PLAN_EXPIRED: Seu plano está vencido. Renove seu plano para voltar a reservar aulas.';
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
GRANT EXECUTE ON FUNCTION public.check_limite_semanal() TO service_role;
