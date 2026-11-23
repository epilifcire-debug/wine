-- Etapas 10–13: concorrência, fila, cancelamento e reativação segura.

-- O histórico do WhatsApp passa a aceitar também oportunidades da lista de espera.
-- Registros antigos continuam vinculados a reservas; novos registros de oportunidade
-- ficam vinculados à entrada da fila.
ALTER TABLE public.whatsapp_notifications
  ALTER COLUMN reserva_id DROP NOT NULL;

ALTER TABLE public.whatsapp_notifications
  ADD COLUMN IF NOT EXISTS lista_espera_id uuid REFERENCES public.lista_espera(id) ON DELETE CASCADE;

ALTER TABLE public.whatsapp_notifications
  DROP CONSTRAINT IF EXISTS whatsapp_notifications_tipo_check;
ALTER TABLE public.whatsapp_notifications
  ADD CONSTRAINT whatsapp_notifications_tipo_check
  CHECK (tipo IN ('confirmacao','checkin','lembrete','oportunidade'));

ALTER TABLE public.whatsapp_notifications
  DROP CONSTRAINT IF EXISTS whatsapp_notifications_origem_check;
ALTER TABLE public.whatsapp_notifications
  ADD CONSTRAINT whatsapp_notifications_origem_check
  CHECK (
    (reserva_id IS NOT NULL AND lista_espera_id IS NULL AND tipo IN ('confirmacao','checkin','lembrete'))
    OR
    (reserva_id IS NULL AND lista_espera_id IS NOT NULL AND tipo = 'oportunidade')
  );

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_notifications_lista_tipo_key
  ON public.whatsapp_notifications(lista_espera_id, tipo)
  WHERE lista_espera_id IS NOT NULL;

-- Serializa alterações que ocupam uma vaga pelo registro da própria turma.
CREATE OR REPLACE FUNCTION public.check_vagas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_limite integer;
  v_ocupadas integer;
  v_cancelada boolean;
BEGIN
  IF NEW.status <> 'confirmada' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'confirmada' THEN RETURN NEW; END IF;

  SELECT h.limite_vagas, h.cancelada
    INTO v_limite, v_cancelada
    FROM public.horarios h
   WHERE h.id = NEW.horario_id
   FOR UPDATE;

  IF v_limite IS NULL OR v_cancelada IS TRUE THEN
    RAISE EXCEPTION 'CLASS_NOT_AVAILABLE: Esta aula não está disponível.';
  END IF;

  SELECT count(*) INTO v_ocupadas
    FROM public.reservas r
   WHERE r.horario_id = NEW.horario_id
     AND r.status = 'confirmada'
     AND r.id <> NEW.id;

  IF v_ocupadas >= v_limite THEN
    RAISE EXCEPTION 'Turma lotada: não há vagas disponíveis para este horário.';
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.check_vagas() FROM PUBLIC, anon, authenticated;

-- Impede confirmar ou reativar reserva de ficha inativa antes das demais validações.
CREATE OR REPLACE FUNCTION public.validar_aluno_reserva()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ativo boolean;
BEGIN
  IF NEW.status <> 'confirmada' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'confirmada' THEN RETURN NEW; END IF;

  SELECT a.ativo INTO v_ativo
    FROM public.alunos a
   WHERE a.id = NEW.aluno_id;

  IF v_ativo IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'INACTIVE_STUDENT: Sua ficha de aluno está inativa.';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.validar_aluno_reserva() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_validar_aluno_reserva ON public.reservas;
CREATE TRIGGER trg_validar_aluno_reserva
  BEFORE INSERT OR UPDATE OF status ON public.reservas
  FOR EACH ROW EXECUTE FUNCTION public.validar_aluno_reserva();

-- Promoção cronológica e exclusiva, com bloqueio da fila e registro para o bot.
CREATE OR REPLACE FUNCTION public.processar_lista_espera()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_limite integer;
  v_ocupadas integer;
  v_proximo uuid;
  v_telefone text;
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status = 'confirmada' AND OLD.status <> 'confirmada') THEN
    UPDATE public.lista_espera
       SET status = 'aceito'
     WHERE horario_id = NEW.horario_id
       AND aluno_id = NEW.aluno_id
       AND status IN ('aguardando','oportunidade_disponivel');
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status = 'cancelada' AND OLD.status <> 'cancelada' THEN
    SELECT h.limite_vagas INTO v_limite
      FROM public.horarios h
     WHERE h.id = NEW.horario_id
     FOR UPDATE;

    SELECT count(*) INTO v_ocupadas
      FROM public.reservas r
     WHERE r.horario_id = NEW.horario_id
       AND r.status = 'confirmada';

    IF v_limite IS NOT NULL AND v_ocupadas < v_limite THEN
      UPDATE public.lista_espera
         SET status = 'expirado'
       WHERE horario_id = NEW.horario_id
         AND status = 'oportunidade_disponivel'
         AND oportunidade_expira_em < now();

      IF NOT EXISTS (
        SELECT 1 FROM public.lista_espera
         WHERE horario_id = NEW.horario_id
           AND status = 'oportunidade_disponivel'
      ) THEN
        SELECT le.id, a.telefone
          INTO v_proximo, v_telefone
          FROM public.lista_espera le
          JOIN public.alunos a ON a.id = le.aluno_id
         WHERE le.horario_id = NEW.horario_id
           AND le.status = 'aguardando'
           AND a.ativo = true
         ORDER BY le.created_at ASC, le.id ASC
         LIMIT 1
         FOR UPDATE OF le SKIP LOCKED;

        IF v_proximo IS NOT NULL THEN
          UPDATE public.lista_espera
             SET status = 'oportunidade_disponivel',
                 oportunidade_em = now(),
                 oportunidade_expira_em = now() + interval '2 hours'
           WHERE id = v_proximo
             AND status = 'aguardando';

          IF FOUND THEN
            INSERT INTO public.whatsapp_notifications
              (reserva_id, lista_espera_id, tipo, telefone)
            VALUES
              (NULL, v_proximo, 'oportunidade', v_telefone)
            ON CONFLICT (lista_espera_id, tipo)
              WHERE lista_espera_id IS NOT NULL
              DO NOTHING;
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.processar_lista_espera() FROM PUBLIC, anon, authenticated;

-- A limpeza é deliberadamente limitada aos três tipos de um ciclo de reserva.
CREATE OR REPLACE FUNCTION public.reset_whatsapp_on_reativacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status = 'cancelada' AND NEW.status = 'confirmada' THEN
    DELETE FROM public.whatsapp_notifications
     WHERE reserva_id = NEW.id
       AND tipo IN ('confirmacao','checkin','lembrete');
    NEW.checkin_em := NULL;
    NEW.presenca := 'pendente';
    NEW.presenca_por := NULL;
    NEW.presenca_em := NULL;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.reset_whatsapp_on_reativacao() FROM PUBLIC, anon, authenticated;

-- Única operação pública para reativar a própria reserva cancelada.
CREATE OR REPLACE FUNCTION public.reativar_reserva(p_reserva_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_reserva public.reservas%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT r.* INTO v_reserva
    FROM public.reservas r
    JOIN public.alunos a ON a.id = r.aluno_id
   WHERE r.id = p_reserva_id
     AND a.user_id = auth.uid()
   FOR UPDATE OF r;

  IF v_reserva.id IS NULL THEN RAISE EXCEPTION 'RESERVATION_NOT_FOUND'; END IF;
  IF v_reserva.status = 'confirmada' THEN RETURN v_reserva.id; END IF;

  UPDATE public.reservas
     SET status = 'confirmada'
   WHERE id = v_reserva.id;

  RETURN v_reserva.id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.reativar_reserva(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reativar_reserva(uuid) TO authenticated, service_role;