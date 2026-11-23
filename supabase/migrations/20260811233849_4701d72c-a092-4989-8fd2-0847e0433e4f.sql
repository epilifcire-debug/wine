-- 1. Remove fichas de aluno de contas admin sem dados vinculados
DELETE FROM public.alunos a
WHERE EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = a.user_id AND r.role = 'admin')
  AND NOT EXISTS (SELECT 1 FROM public.reservas x WHERE x.aluno_id = a.id)
  AND NOT EXISTS (SELECT 1 FROM public.presencas x WHERE x.aluno_id = a.id);

-- 2. Signup: admin não recebe ficha de aluno
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_nome text; v_role app_role;
BEGIN
  v_nome := COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  INSERT INTO public.profiles (id, nome, foto_url)
    VALUES (NEW.id, v_nome, NEW.raw_user_meta_data->>'avatar_url')
    ON CONFLICT (id) DO NOTHING;

  v_role := CASE WHEN lower(NEW.email) = 'winebarbellclub@gmail.com' THEN 'admin'::app_role ELSE 'aluno'::app_role END;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role)
    ON CONFLICT (user_id, role) DO NOTHING;

  IF v_role <> 'admin' THEN
    INSERT INTO public.alunos (user_id, nome, email) VALUES (NEW.id, v_nome, NEW.email)
      ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END; $function$;

-- 3. Impede fichas de aluno para contas admin
CREATE OR REPLACE FUNCTION public.block_admin_aluno()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_roles r WHERE r.user_id = NEW.user_id AND r.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Contas de administrador não podem ter ficha de aluno.';
  END IF;
  RETURN NEW;
END; $function$;

DROP TRIGGER IF EXISTS trg_block_admin_aluno ON public.alunos;
CREATE TRIGGER trg_block_admin_aluno
BEFORE INSERT OR UPDATE OF user_id ON public.alunos
FOR EACH ROW EXECUTE FUNCTION public.block_admin_aluno();