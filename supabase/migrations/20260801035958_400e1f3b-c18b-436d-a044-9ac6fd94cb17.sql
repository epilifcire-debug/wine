CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_nome text;
BEGIN
  v_nome := COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  INSERT INTO public.profiles (id, nome, foto_url)
    VALUES (NEW.id, v_nome, NEW.raw_user_meta_data->>'avatar_url')
    ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'aluno')
    ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.alunos (user_id, nome, email) VALUES (NEW.id, v_nome, NEW.email)
    ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $function$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP POLICY IF EXISTS sensiveis_select_own ON public.alunos_sensiveis;
CREATE POLICY sensiveis_select_own ON public.alunos_sensiveis
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = alunos_sensiveis.aluno_id AND a.user_id = auth.uid()));

DROP POLICY IF EXISTS sensiveis_insert_own ON public.alunos_sensiveis;
CREATE POLICY sensiveis_insert_own ON public.alunos_sensiveis
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = alunos_sensiveis.aluno_id AND a.user_id = auth.uid()));

DROP POLICY IF EXISTS sensiveis_update_own ON public.alunos_sensiveis;
CREATE POLICY sensiveis_update_own ON public.alunos_sensiveis
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = alunos_sensiveis.aluno_id AND a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = alunos_sensiveis.aluno_id AND a.user_id = auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.alunos_sensiveis TO authenticated;
GRANT ALL ON public.alunos_sensiveis TO service_role;

DROP TRIGGER IF EXISTS trg_sync_mascarados ON public.alunos_sensiveis;
CREATE TRIGGER trg_sync_mascarados
  AFTER INSERT OR UPDATE ON public.alunos_sensiveis
  FOR EACH ROW EXECUTE FUNCTION public.sync_mascarados();

DROP TRIGGER IF EXISTS trg_check_vagas ON public.reservas;
CREATE TRIGGER trg_check_vagas
  BEFORE INSERT OR UPDATE ON public.reservas
  FOR EACH ROW EXECUTE FUNCTION public.check_vagas();

DROP TRIGGER IF EXISTS trg_alunos_updated ON public.alunos;
CREATE TRIGGER trg_alunos_updated BEFORE UPDATE ON public.alunos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();