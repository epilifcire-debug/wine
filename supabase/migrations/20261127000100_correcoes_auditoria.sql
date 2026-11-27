-- Correções da auditoria de 27/11/2026 (reservas, Day Use, validade, limites, permissões).
-- "Hoje" e horários sempre no fuso de Brasília.

CREATE OR REPLACE FUNCTION public.hoje_brasilia()
RETURNS date LANGUAGE sql STABLE AS
$$ SELECT (now() AT TIME ZONE 'America/Sao_Paulo')::date $$;

-- 1) Day Use em reserva nova: a reserva ainda não existe quando o gatilho BEFORE liga o
--    Day Use a ela. A chave estrangeira passa a ser conferida só no fim da transação.
ALTER TABLE public.day_uses DROP CONSTRAINT IF EXISTS day_uses_reserva_id_fkey;
ALTER TABLE public.day_uses
  ADD CONSTRAINT day_uses_reserva_id_fkey FOREIGN KEY (reserva_id)
  REFERENCES public.reservas(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- 2 e 3) Validade comparada com a DATA DA AULA; trava por mês além da trava por semana.
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
    ORDER BY ap.data_inicio DESC NULLS LAST, ap.created_at DESC LIMIT 1;
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

-- 4 a 7 e 9) Regras de reserva para quem não é administrador:
--   não reservar nem reativar aula que já começou; não cancelar aula que já começou ou
--   com presença/check-in; reserva nasce sem presença; e (para todos) não ter duas aulas
--   confirmadas no mesmo dia e horário.
CREATE OR REPLACE FUNCTION public.guard_reserva()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $$
DECLARE
  v_inicio timestamptz;
  v_data date; v_hora time;
  v_admin boolean := auth.role() = 'service_role' OR private.is_admin();
  v_ativando boolean := NEW.status = 'confirmada'
    AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'confirmada');
BEGIN
  SELECT h.data, h.horario, (h.data + h.horario) AT TIME ZONE 'America/Sao_Paulo'
    INTO v_data, v_hora, v_inicio
    FROM public.horarios h WHERE h.id = NEW.horario_id;

  -- Mesmo dia e horário (vale para todos).
  IF v_ativando AND EXISTS (
    SELECT 1 FROM public.reservas r JOIN public.horarios h ON h.id = r.horario_id
    WHERE r.aluno_id = NEW.aluno_id AND r.status = 'confirmada' AND r.id <> NEW.id
      AND h.cancelada = false AND h.data = v_data AND h.horario = v_hora
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_TIME_SLOT: Você já tem uma aula reservada neste dia e horário.';
  END IF;

  IF v_admin THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    -- Presença e check-in só pela administração/professor ou pelo fluxo de check-in.
    NEW.presenca := 'pendente';
    NEW.presenca_por := NULL;
    NEW.presenca_em := NULL;
    NEW.checkin_em := NULL;
  END IF;

  IF v_ativando AND v_inicio IS NOT NULL AND v_inicio <= now() THEN
    RAISE EXCEPTION 'CLASS_ALREADY_STARTED: Esta aula já começou ou já passou.';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'confirmada' AND NEW.status = 'cancelada' THEN
    IF OLD.presenca = 'presente' OR OLD.checkin_em IS NOT NULL THEN
      RAISE EXCEPTION 'CANCEL_NOT_ALLOWED: Esta aula já tem presença registrada e não pode ser cancelada.';
    END IF;
    IF v_inicio IS NOT NULL AND v_inicio <= now() THEN
      RAISE EXCEPTION 'CANCEL_NOT_ALLOWED: Não é possível cancelar uma aula que já começou.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_reserva() FROM PUBLIC, anon, authenticated;

-- Roda antes das checagens de vaga e de plano (ordem alfabética dos gatilhos).
DROP TRIGGER IF EXISTS trg_a_guard_reserva ON public.reservas;
CREATE TRIGGER trg_a_guard_reserva
  BEFORE INSERT OR UPDATE ON public.reservas
  FOR EACH ROW EXECUTE FUNCTION public.guard_reserva();

-- 6) Aluno não apaga reserva (só cancela); apagar é só da administração.
DROP POLICY IF EXISTS reservas_delete_own_or_admin ON public.reservas;
DROP POLICY IF EXISTS reservas_delete_admin ON public.reservas;
CREATE POLICY reservas_delete_admin ON public.reservas
  FOR DELETE TO authenticated USING (private.is_admin());

-- Se a administração apagar uma reserva paga com Day Use, o Day Use volta.
CREATE OR REPLACE FUNCTION public.devolver_day_use_ao_apagar()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
BEGIN
  UPDATE public.day_uses
     SET status = CASE WHEN validade IS NOT NULL AND validade < public.hoje_brasilia()
                       THEN 'vencido'::public.day_use_status ELSE 'disponivel'::public.day_use_status END,
         reserva_id = NULL, utilizado_em = NULL
   WHERE reserva_id = OLD.id AND status = 'reservado';
  RETURN OLD;
END; $$;
DROP TRIGGER IF EXISTS trg_devolver_day_use_ao_apagar ON public.reservas;
CREATE TRIGGER trg_devolver_day_use_ao_apagar
  BEFORE DELETE ON public.reservas
  FOR EACH ROW EXECUTE FUNCTION public.devolver_day_use_ao_apagar();

-- Day Use devolvido no cancelamento: validade conferida no dia de Brasília.
CREATE OR REPLACE FUNCTION public.devolver_day_use()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $function$
BEGIN
  IF NEW.status = 'cancelada' AND OLD.status <> 'cancelada' THEN
    UPDATE public.day_uses
       SET status = CASE WHEN validade IS NOT NULL AND validade < public.hoje_brasilia()
                         THEN 'vencido'::public.day_use_status ELSE 'disponivel'::public.day_use_status END,
           reserva_id = NULL,
           utilizado_em = NULL
     WHERE reserva_id = NEW.id AND status = 'reservado';
  END IF;
  RETURN NEW;
END; $function$;
