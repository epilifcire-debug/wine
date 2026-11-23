CREATE TABLE public.planos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  limite_semanal integer,
  preco_centavos integer NOT NULL DEFAULT 0,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.planos TO authenticated;
GRANT ALL ON public.planos TO service_role;

ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;

CREATE POLICY planos_select_auth ON public.planos FOR SELECT TO authenticated USING (true);
CREATE POLICY planos_write_admin ON public.planos FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

CREATE TRIGGER trg_planos_updated BEFORE UPDATE ON public.planos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.planos (nome, descricao, limite_semanal, preco_centavos, ordem) VALUES
  ('Flagship', 'Até 3 aulas por semana.', 3, 0, 1),
  ('Crew', 'Até 5 aulas por semana.', 5, 0, 2),
  ('Ilimitado', 'Aulas ilimitadas na semana.', NULL, 0, 3);

ALTER TABLE public.alunos
  ADD CONSTRAINT alunos_plano_id_fkey FOREIGN KEY (plano_id)
  REFERENCES public.planos(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.check_limite_semanal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_limite integer;
  v_nome text;
  v_data date;
  v_ini date;
  v_count integer;
BEGIN
  IF NEW.status <> 'confirmada' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'confirmada' THEN RETURN NEW; END IF;

  SELECT p.limite_semanal, p.nome INTO v_limite, v_nome
  FROM public.alunos a
  JOIN public.planos p ON p.id = a.plano_id
  WHERE a.id = NEW.aluno_id;

  IF v_limite IS NULL THEN RETURN NEW; END IF;

  SELECT h.data INTO v_data FROM public.horarios h WHERE h.id = NEW.horario_id;
  IF v_data IS NULL THEN RETURN NEW; END IF;
  v_ini := date_trunc('week', v_data::timestamp)::date;

  SELECT count(*) INTO v_count
  FROM public.reservas r
  JOIN public.horarios h ON h.id = r.horario_id
  WHERE r.aluno_id = NEW.aluno_id
    AND r.status = 'confirmada'
    AND r.id <> NEW.id
    AND h.cancelada = false
    AND h.data >= v_ini
    AND h.data < v_ini + 7;

  IF v_count >= v_limite THEN
    RAISE EXCEPTION 'Limite semanal do plano % atingido: % aula(s) por semana. Cancele outra reserva desta semana ou fale com o estúdio.', v_nome, v_limite;
  END IF;

  RETURN NEW;
END; $$;

REVOKE ALL ON FUNCTION public.check_limite_semanal() FROM PUBLIC;

CREATE TRIGGER trg_check_limite_semanal BEFORE INSERT OR UPDATE ON public.reservas
FOR EACH ROW EXECUTE FUNCTION public.check_limite_semanal();