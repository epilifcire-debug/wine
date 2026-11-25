-- Aviso para os alunos quando um evento é publicado (aparece em "Avisos recentes" no Início).
-- Um aviso por evento; some junto se o evento for apagado.
ALTER TABLE public.notificacoes
  ADD COLUMN IF NOT EXISTS evento_id uuid REFERENCES public.eventos(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS notificacoes_evento_unico
  ON public.notificacoes (evento_id) WHERE evento_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.notificar_evento_publicado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quando text;
BEGIN
  IF NEW.publicado IS NOT TRUE THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.publicado IS TRUE THEN RETURN NEW; END IF;

  v_quando := to_char(NEW.data, 'DD/MM')
    || CASE WHEN NEW.horario IS NOT NULL THEN ' às ' || to_char(NEW.horario, 'HH24:MI') ELSE '' END
    || CASE WHEN coalesce(NEW.local, '') <> '' THEN ' · ' || NEW.local ELSE '' END;

  INSERT INTO public.notificacoes (titulo, mensagem, tipo, evento_id)
  VALUES ('Novo evento: ' || NEW.titulo, v_quando, 'evento', NEW.id)
  ON CONFLICT (evento_id) WHERE evento_id IS NOT NULL DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notificar_evento_publicado ON public.eventos;
CREATE TRIGGER trg_notificar_evento_publicado
  AFTER INSERT OR UPDATE OF publicado ON public.eventos
  FOR EACH ROW EXECUTE FUNCTION public.notificar_evento_publicado();
