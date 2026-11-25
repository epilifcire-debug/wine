-- Avisa o admin quando um aluno seleciona um plano (fica aguardando pagamento).
-- A notificação usa tipo 'admin_plano_pendente' e só o admin pode lê-la.

CREATE OR REPLACE FUNCTION public.notificar_plano_pendente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_aluno text;
  v_plano text;
BEGIN
  IF NEW.status <> 'aguardando_pagamento' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.plano_id IS NOT DISTINCT FROM NEW.plano_id THEN
    RETURN NEW;
  END IF;

  SELECT a.nome INTO v_aluno FROM public.alunos a WHERE a.id = NEW.aluno_id;
  SELECT p.nome INTO v_plano FROM public.planos p WHERE p.id = NEW.plano_id;

  INSERT INTO public.notificacoes (titulo, mensagem, tipo)
  VALUES (
    'Novo plano aguardando pagamento',
    coalesce(v_aluno, 'Um aluno') || ' escolheu o plano ' || coalesce(v_plano, '') || '. Confirme o pagamento em Financeiro.',
    'admin_plano_pendente'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notificar_plano_pendente ON public.aluno_planos;
CREATE TRIGGER trg_notificar_plano_pendente
  AFTER INSERT OR UPDATE OF plano_id, status ON public.aluno_planos
  FOR EACH ROW EXECUTE FUNCTION public.notificar_plano_pendente();

-- Notificações de admin ficam ocultas para alunos.
DROP POLICY IF EXISTS "notificacoes_select_auth" ON public.notificacoes;
CREATE POLICY "notificacoes_select_auth" ON public.notificacoes
  FOR SELECT TO authenticated
  USING (private.is_admin() OR tipo NOT LIKE 'admin\_%');

-- Realtime para o popup do admin.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END;
$$;
