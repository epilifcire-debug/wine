
CREATE TYPE public.espera_status AS ENUM ('aguardando','oportunidade_disponivel','aceito','expirado','removido','cancelado');

CREATE TABLE public.lista_espera (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  horario_id uuid NOT NULL REFERENCES public.horarios(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  status public.espera_status NOT NULL DEFAULT 'aguardando',
  oportunidade_em timestamptz,
  oportunidade_expira_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lista_espera TO authenticated;
GRANT ALL ON public.lista_espera TO service_role;

ALTER TABLE public.lista_espera ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX lista_espera_ativa_unica
  ON public.lista_espera (horario_id, aluno_id)
  WHERE status IN ('aguardando','oportunidade_disponivel');

CREATE INDEX lista_espera_fila ON public.lista_espera (horario_id, created_at);

CREATE POLICY "Aluno ve sua lista de espera"
  ON public.lista_espera FOR SELECT TO authenticated
  USING (aluno_id IN (SELECT a.id FROM public.alunos a WHERE a.user_id = auth.uid()) OR private.is_admin());

CREATE POLICY "Aluno entra na lista de espera"
  ON public.lista_espera FOR INSERT TO authenticated
  WITH CHECK (aluno_id IN (SELECT a.id FROM public.alunos a WHERE a.user_id = auth.uid()) OR private.is_admin());

CREATE POLICY "Aluno atualiza sua lista de espera"
  ON public.lista_espera FOR UPDATE TO authenticated
  USING (aluno_id IN (SELECT a.id FROM public.alunos a WHERE a.user_id = auth.uid()) OR private.is_admin())
  WITH CHECK (aluno_id IN (SELECT a.id FROM public.alunos a WHERE a.user_id = auth.uid()) OR private.is_admin());

CREATE POLICY "Admin remove lista de espera"
  ON public.lista_espera FOR DELETE TO authenticated
  USING (private.is_admin());

CREATE TRIGGER set_lista_espera_updated_at
  BEFORE UPDATE ON public.lista_espera
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Entrar na fila (somente se a turma estiver lotada e sem reserva confirmada)
CREATE OR REPLACE FUNCTION public.entrar_lista_espera(p_horario_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_aluno uuid;
  v_limite int;
  v_ocupadas int;
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  v_aluno := public.ensure_current_student();
  IF v_aluno IS NULL THEN RAISE EXCEPTION 'NO_STUDENT_RECORD'; END IF;

  SELECT limite_vagas INTO v_limite FROM public.horarios WHERE id = p_horario_id AND cancelada = false;
  IF v_limite IS NULL THEN RAISE EXCEPTION 'CLASS_NOT_AVAILABLE'; END IF;

  IF EXISTS (SELECT 1 FROM public.reservas r WHERE r.horario_id = p_horario_id AND r.aluno_id = v_aluno AND r.status = 'confirmada') THEN
    RAISE EXCEPTION 'ALREADY_BOOKED';
  END IF;

  SELECT count(*) INTO v_ocupadas FROM public.reservas r WHERE r.horario_id = p_horario_id AND r.status = 'confirmada';
  IF v_ocupadas < v_limite THEN RAISE EXCEPTION 'CLASS_HAS_SPOTS'; END IF;

  SELECT id INTO v_id FROM public.lista_espera
   WHERE horario_id = p_horario_id AND aluno_id = v_aluno
     AND status IN ('aguardando','oportunidade_disponivel');
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  INSERT INTO public.lista_espera (horario_id, aluno_id) VALUES (p_horario_id, v_aluno) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.entrar_lista_espera(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.entrar_lista_espera(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.sair_lista_espera(p_horario_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_aluno uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  SELECT a.id INTO v_aluno FROM public.alunos a WHERE a.user_id = auth.uid();
  IF v_aluno IS NULL THEN RETURN; END IF;
  UPDATE public.lista_espera
     SET status = 'cancelado'
   WHERE horario_id = p_horario_id AND aluno_id = v_aluno
     AND status IN ('aguardando','oportunidade_disponivel');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sair_lista_espera(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.sair_lista_espera(uuid) TO authenticated;

-- Ao liberar vaga (cancelamento), oferecer ao primeiro da fila; ao reservar, marcar como aceito
CREATE OR REPLACE FUNCTION public.processar_lista_espera()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limite int;
  v_ocupadas int;
  v_proximo uuid;
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status = 'confirmada' AND OLD.status <> 'confirmada') THEN
    UPDATE public.lista_espera
       SET status = 'aceito'
     WHERE horario_id = NEW.horario_id AND aluno_id = NEW.aluno_id
       AND status IN ('aguardando','oportunidade_disponivel');
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status = 'cancelada' AND OLD.status <> 'cancelada' THEN
    SELECT limite_vagas INTO v_limite FROM public.horarios WHERE id = NEW.horario_id;
    SELECT count(*) INTO v_ocupadas FROM public.reservas r WHERE r.horario_id = NEW.horario_id AND r.status = 'confirmada';
    IF v_limite IS NOT NULL AND v_ocupadas < v_limite THEN
      UPDATE public.lista_espera
         SET status = 'expirado'
       WHERE horario_id = NEW.horario_id
         AND status = 'oportunidade_disponivel'
         AND oportunidade_expira_em < now();

      IF NOT EXISTS (
        SELECT 1 FROM public.lista_espera
         WHERE horario_id = NEW.horario_id AND status = 'oportunidade_disponivel'
      ) THEN
        SELECT id INTO v_proximo FROM public.lista_espera
         WHERE horario_id = NEW.horario_id AND status = 'aguardando'
         ORDER BY created_at ASC LIMIT 1;
        IF v_proximo IS NOT NULL THEN
          UPDATE public.lista_espera
             SET status = 'oportunidade_disponivel',
                 oportunidade_em = now(),
                 oportunidade_expira_em = now() + interval '2 hours'
           WHERE id = v_proximo;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.processar_lista_espera() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS trg_processar_lista_espera ON public.reservas;
CREATE TRIGGER trg_processar_lista_espera
  AFTER INSERT OR UPDATE OF status ON public.reservas
  FOR EACH ROW EXECUTE FUNCTION public.processar_lista_espera();
