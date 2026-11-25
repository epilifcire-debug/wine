-- Login por nome de usuário OU e-mail; e-mail opcional no cadastro.
-- Contas sem e-mail usam um endereço interno <usuario>@sem-email.wbc.invalid,
-- que nunca é exibido nem recebe mensagens.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unico ON public.profiles (lower(username));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome text;
  v_role app_role;
  v_username text;
  v_email text;
BEGIN
  v_nome := COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  v_username := nullif(lower(trim(NEW.raw_user_meta_data->>'username')), '');
  v_email := CASE WHEN NEW.email ILIKE '%@sem-email.wbc.invalid' THEN NULL ELSE NEW.email END;

  BEGIN
    INSERT INTO public.profiles (id, nome, foto_url, username)
      VALUES (NEW.id, v_nome, NEW.raw_user_meta_data->>'avatar_url', v_username)
      ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: falha ao criar profile de %: %', NEW.id, SQLERRM;
  END;

  v_role := CASE WHEN lower(NEW.email) = 'winebarbellclub@gmail.com' THEN 'admin'::app_role ELSE 'aluno'::app_role END;

  BEGIN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role)
      ON CONFLICT (user_id, role) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: falha ao criar papel de %: %', NEW.id, SQLERRM;
  END;

  IF v_role <> 'admin' THEN
    BEGIN
      INSERT INTO public.alunos (user_id, nome, email) VALUES (NEW.id, v_nome, v_email)
        ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'handle_new_user: falha ao criar ficha de %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END; $$;
