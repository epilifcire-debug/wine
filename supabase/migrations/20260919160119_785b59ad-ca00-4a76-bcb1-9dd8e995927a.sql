CREATE OR REPLACE FUNCTION public.protect_student_and_reservation_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_owner boolean := false;
  v_is_professor boolean := false;
  v_start timestamptz;
BEGIN
  IF auth.role() = 'service_role' OR private.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'alunos' THEN
    v_is_owner := OLD.user_id = auth.uid();
    IF NOT v_is_owner THEN
      RAISE EXCEPTION 'NOT_ALLOWED: ficha de aluno não pertence ao usuário';
    END IF;

    IF NEW.user_id IS DISTINCT FROM OLD.user_id
      OR NEW.plano_id IS DISTINCT FROM OLD.plano_id
      OR NEW.ativo IS DISTINCT FROM OLD.ativo
      OR NEW.codigo_wbc IS DISTINCT FROM OLD.codigo_wbc
      OR NEW.metadata IS DISTINCT FROM OLD.metadata
      OR NEW.google_calendar_id IS DISTINCT FROM OLD.google_calendar_id
      OR NEW.cpf_mascarado IS DISTINCT FROM OLD.cpf_mascarado
      OR NEW.nascimento_mascarado IS DISTINCT FROM OLD.nascimento_mascarado THEN
      RAISE EXCEPTION 'PROTECTED_STUDENT_FIELDS: campos administrativos não podem ser alterados pelo aluno';
    END IF;
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.alunos a
    WHERE a.id = OLD.aluno_id AND a.user_id = auth.uid()
  ) INTO v_is_owner;

  SELECT EXISTS (
    SELECT 1 FROM public.horarios h
    WHERE h.id = OLD.horario_id AND h.professor_user_id = auth.uid()
  ) INTO v_is_professor;

  IF v_is_owner THEN
    IF NEW.aluno_id IS DISTINCT FROM OLD.aluno_id
      OR NEW.horario_id IS DISTINCT FROM OLD.horario_id
      OR NEW.presenca IS DISTINCT FROM OLD.presenca
      OR NEW.presenca_por IS DISTINCT FROM OLD.presenca_por
      OR NEW.presenca_em IS DISTINCT FROM OLD.presenca_em THEN
      RAISE EXCEPTION 'PROTECTED_RESERVATION_FIELDS: aluno não pode alterar campos administrativos da reserva';
    END IF;

    IF NEW.checkin_em IS DISTINCT FROM OLD.checkin_em THEN
      IF OLD.checkin_em IS NOT NULL OR NEW.checkin_em IS NULL THEN
        RAISE EXCEPTION 'CHECKIN_ALREADY_RECORDED: o check-in já foi registrado';
      END IF;
      IF OLD.status <> 'confirmada' OR NEW.status <> 'confirmada' THEN
        RAISE EXCEPTION 'CHECKIN_REQUIRES_CONFIRMED_BOOKING: a reserva precisa estar confirmada';
      END IF;
      SELECT (h.data + h.horario) AT TIME ZONE 'America/Sao_Paulo'
        INTO v_start FROM public.horarios h WHERE h.id = OLD.horario_id;
      IF v_start IS NULL OR now() < v_start - interval '3 hours' OR now() > v_start + interval '1 hour' THEN
        RAISE EXCEPTION 'CHECKIN_OUTSIDE_WINDOW: check-in permitido de 3h antes até 1h após o início';
      END IF;
      NEW.checkin_em := now();
    END IF;
    RETURN NEW;
  END IF;

  IF v_is_professor THEN
    IF NEW.aluno_id IS DISTINCT FROM OLD.aluno_id
      OR NEW.horario_id IS DISTINCT FROM OLD.horario_id
      OR NEW.status IS DISTINCT FROM OLD.status
      OR NEW.checkin_em IS DISTINCT FROM OLD.checkin_em THEN
      RAISE EXCEPTION 'PROFESSOR_PRESENCE_ONLY: professor pode alterar somente a presença';
    END IF;
    IF NEW.presenca IS DISTINCT FROM OLD.presenca THEN
      NEW.presenca_por := auth.uid();
      NEW.presenca_em := now();
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'NOT_ALLOWED: atualização não autorizada';
END;
$$;

REVOKE ALL ON FUNCTION public.protect_student_and_reservation_fields() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.protect_student_and_reservation_fields() TO service_role;

DROP TRIGGER IF EXISTS trg_protect_student_fields ON public.alunos;
CREATE TRIGGER trg_protect_student_fields
BEFORE UPDATE ON public.alunos
FOR EACH ROW EXECUTE FUNCTION public.protect_student_and_reservation_fields();

DROP TRIGGER IF EXISTS trg_protect_reservation_fields ON public.reservas;
CREATE TRIGGER trg_protect_reservation_fields
BEFORE UPDATE ON public.reservas
FOR EACH ROW EXECUTE FUNCTION public.protect_student_and_reservation_fields();

CREATE OR REPLACE FUNCTION public.check_limite_semanal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_plano_id uuid; v_ativo boolean; v_limite integer;
  v_data date; v_ini date; v_count integer; v_venc date;
  v_day_use uuid; v_plano_ok boolean := false;
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
    WHERE ap.aluno_id = NEW.aluno_id AND ap.status <> 'cancelado'
    ORDER BY ap.data_inicio DESC, ap.created_at DESC LIMIT 1;

    IF v_ativo IS true AND (v_venc IS NULL OR v_venc >= CURRENT_DATE) THEN
      IF v_limite IS NULL THEN
        v_plano_ok := true;
      ELSE
        SELECT count(*) INTO v_count
        FROM public.reservas r
        JOIN public.horarios h ON h.id = r.horario_id
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
    UPDATE public.day_uses SET status = 'reservado', reserva_id = NEW.id, utilizado_em = now()
    WHERE id = v_day_use;
    RETURN NEW;
  END IF;

  IF v_plano_id IS NULL OR v_ativo IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'NO_ACTIVE_PLAN: Você ainda não possui um plano ativo. Escolha um plano ou compre um Day Use para reservar sua aula.';
  END IF;
  IF v_venc IS NOT NULL AND v_venc < CURRENT_DATE THEN
    RAISE EXCEPTION 'PLAN_EXPIRED: Seu plano está vencido. Renove seu plano para voltar a reservar aulas.';
  END IF;
  RAISE EXCEPTION 'WEEKLY_PLAN_LIMIT_REACHED: Seu plano permite até % aula(s) por semana. Para realizar mais aulas, faça upgrade do seu plano ou compre um Day Use.', v_limite;
END;
$$;

REVOKE ALL ON FUNCTION public.check_limite_semanal() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_limite_semanal() TO service_role;