CREATE TYPE public.plano_evento AS ENUM ('contratacao','renovacao','upgrade','downgrade','cancelamento','reativacao');
CREATE TYPE public.contrato_status AS ENUM ('ativo','proximo_vencimento','vencido','cancelado');

CREATE TABLE public.plano_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  plano_anterior_id uuid REFERENCES public.planos(id),
  plano_novo_id uuid REFERENCES public.planos(id),
  tipo public.plano_evento NOT NULL,
  responsavel_user_id uuid REFERENCES auth.users(id),
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.plano_historico TO authenticated;
GRANT ALL ON public.plano_historico TO service_role;
ALTER TABLE public.plano_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY historico_select_own_or_admin ON public.plano_historico FOR SELECT TO authenticated
  USING (private.is_admin() OR EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = plano_historico.aluno_id AND a.user_id = auth.uid()));
CREATE POLICY historico_insert_admin ON public.plano_historico FOR INSERT TO authenticated
  WITH CHECK (private.is_admin());

CREATE TABLE public.aluno_planos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  plano_id uuid REFERENCES public.planos(id),
  data_inicio date NOT NULL DEFAULT CURRENT_DATE,
  data_fim date,
  proximo_vencimento date,
  valor_centavos integer NOT NULL DEFAULT 0,
  status public.contrato_status NOT NULL DEFAULT 'ativo',
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX aluno_planos_aluno_idx ON public.aluno_planos(aluno_id, data_inicio DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aluno_planos TO authenticated;
GRANT ALL ON public.aluno_planos TO service_role;
ALTER TABLE public.aluno_planos ENABLE ROW LEVEL SECURITY;
CREATE POLICY contratos_select_own_or_admin ON public.aluno_planos FOR SELECT TO authenticated
  USING (private.is_admin() OR EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = aluno_planos.aluno_id AND a.user_id = auth.uid()));
CREATE POLICY contratos_write_admin ON public.aluno_planos FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE TRIGGER trg_aluno_planos_updated BEFORE UPDATE ON public.aluno_planos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.log_plano_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old integer; v_new integer; v_tipo public.plano_evento;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.plano_id IS NOT DISTINCT FROM NEW.plano_id THEN RETURN NEW; END IF;
  IF NEW.plano_id IS NULL AND TG_OP = 'INSERT' THEN RETURN NEW; END IF;

  SELECT preco_centavos INTO v_old FROM public.planos WHERE id = (CASE WHEN TG_OP='UPDATE' THEN OLD.plano_id ELSE NULL END);
  SELECT preco_centavos INTO v_new FROM public.planos WHERE id = NEW.plano_id;

  IF NEW.plano_id IS NULL THEN v_tipo := 'cancelamento';
  ELSIF TG_OP = 'INSERT' OR OLD.plano_id IS NULL THEN v_tipo := 'contratacao';
  ELSIF COALESCE(v_new,0) > COALESCE(v_old,0) THEN v_tipo := 'upgrade';
  ELSIF COALESCE(v_new,0) < COALESCE(v_old,0) THEN v_tipo := 'downgrade';
  ELSE v_tipo := 'renovacao';
  END IF;

  INSERT INTO public.plano_historico (aluno_id, plano_anterior_id, plano_novo_id, tipo, responsavel_user_id)
  VALUES (NEW.id, CASE WHEN TG_OP='UPDATE' THEN OLD.plano_id ELSE NULL END, NEW.plano_id, v_tipo, auth.uid());
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.log_plano_change() FROM anon, authenticated;

CREATE TRIGGER trg_log_plano_change AFTER INSERT OR UPDATE OF plano_id ON public.alunos
  FOR EACH ROW EXECUTE FUNCTION public.log_plano_change();