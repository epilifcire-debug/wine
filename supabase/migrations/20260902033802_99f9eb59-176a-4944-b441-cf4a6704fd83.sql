CREATE TABLE public.eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  informacoes text,
  imagem_url text,
  data date NOT NULL,
  horario time,
  local text,
  publicado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.eventos TO authenticated;
GRANT ALL ON public.eventos TO service_role;

ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Eventos publicados visiveis para autenticados"
ON public.eventos FOR SELECT TO authenticated
USING (publicado = true OR private.is_admin() OR private.is_admin_master());

CREATE POLICY "Admins gerenciam eventos"
ON public.eventos FOR ALL TO authenticated
USING (private.is_admin() OR private.is_admin_master())
WITH CHECK (private.is_admin() OR private.is_admin_master());

CREATE TRIGGER set_eventos_updated_at
BEFORE UPDATE ON public.eventos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX eventos_data_idx ON public.eventos (data DESC);