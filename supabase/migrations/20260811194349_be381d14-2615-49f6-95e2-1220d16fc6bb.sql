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

  INSERT INTO public.alunos (user_id, nome, email) VALUES (NEW.id, v_nome, NEW.email)
    ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $function$;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE lower(email) = 'winebarbellclub@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;