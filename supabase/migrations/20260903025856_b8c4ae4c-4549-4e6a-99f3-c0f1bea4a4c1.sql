
-- 1) Função idempotente para criar/recuperar a ficha do aluno logado
CREATE OR REPLACE FUNCTION public.ensure_current_student()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_nome text;
  v_tel text;
  v_id uuid;
  v_count integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  -- Admin (sem papel de aluno) não recebe ficha
  IF EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = v_uid AND r.role = 'admin')
     AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = v_uid AND r.role = 'aluno') THEN
    RETURN NULL;
  END IF;

  -- 1. já vinculada?
  SELECT a.id INTO v_id FROM public.alunos a WHERE a.user_id = v_uid;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  SELECT lower(u.email),
         COALESCE(u.raw_user_meta_data->>'nome', u.raw_user_meta_data->>'full_name',
                  u.raw_user_meta_data->>'name', split_part(u.email,'@',1)),
         NULLIF(regexp_replace(COALESCE(u.raw_user_meta_data->>'telefone',''), '\D', '', 'g'), '')
    INTO v_email, v_nome, v_tel
  FROM auth.users u WHERE u.id = v_uid;

  -- 2. ficha antiga por e-mail (única e sem conta vinculada)
  IF v_email IS NOT NULL THEN
    SELECT count(*) INTO v_count FROM public.alunos a
     WHERE a.user_id IS NULL AND lower(a.email) = v_email;
    IF v_count = 1 THEN
      UPDATE public.alunos a SET user_id = v_uid
       WHERE a.user_id IS NULL AND lower(a.email) = v_email
       RETURNING a.id INTO v_id;
      RETURN v_id;
    END IF;
  END IF;

  -- 3. ficha antiga por telefone normalizado (única e sem conta vinculada)
  IF v_tel IS NOT NULL THEN
    SELECT count(*) INTO v_count FROM public.alunos a
     WHERE a.user_id IS NULL AND regexp_replace(COALESCE(a.telefone,''), '\D', '', 'g') = v_tel;
    IF v_count = 1 THEN
      UPDATE public.alunos a SET user_id = v_uid
       WHERE a.user_id IS NULL AND regexp_replace(COALESCE(a.telefone,''), '\D', '', 'g') = v_tel
       RETURNING a.id INTO v_id;
      RETURN v_id;
    END IF;
  END IF;

  -- 4. cria ficha nova, sem plano (tolerante a concorrência)
  INSERT INTO public.alunos (user_id, nome, email, ativo, plano_id)
  VALUES (v_uid, COALESCE(v_nome, 'Aluno'), v_email, true, NULL)
  ON CONFLICT (user_id) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT a.id INTO v_id FROM public.alunos a WHERE a.user_id = v_uid;
  END IF;

  RETURN v_id;
END; $$;

REVOKE ALL ON FUNCTION public.ensure_current_student() FROM public;
GRANT EXECUTE ON FUNCTION public.ensure_current_student() TO authenticated;

-- 2) Cadastro de novo usuário resistente a falhas
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_nome text; v_role app_role;
BEGIN
  v_nome := COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));

  BEGIN
    INSERT INTO public.profiles (id, nome, foto_url)
      VALUES (NEW.id, v_nome, NEW.raw_user_meta_data->>'avatar_url')
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
      INSERT INTO public.alunos (user_id, nome, email) VALUES (NEW.id, v_nome, NEW.email)
        ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'handle_new_user: falha ao criar ficha de %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END; $$;

-- 3) Backfill: contas de aluno sem ficha
DO $$
DECLARE r record; v_email text; v_count integer; v_id uuid;
BEGIN
  FOR r IN
    SELECT u.id, lower(u.email) AS email,
           COALESCE(u.raw_user_meta_data->>'nome', u.raw_user_meta_data->>'full_name',
                    u.raw_user_meta_data->>'name', split_part(u.email,'@',1)) AS nome
      FROM auth.users u
     WHERE NOT EXISTS (SELECT 1 FROM public.alunos a WHERE a.user_id = u.id)
       AND NOT (
         EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id AND ur.role = 'admin')
         AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id AND ur.role = 'aluno')
       )
  LOOP
    v_email := r.email;
    SELECT count(*) INTO v_count FROM public.alunos a
     WHERE a.user_id IS NULL AND lower(a.email) = v_email;
    IF v_count = 1 THEN
      UPDATE public.alunos a SET user_id = r.id
       WHERE a.user_id IS NULL AND lower(a.email) = v_email;
    ELSE
      INSERT INTO public.alunos (user_id, nome, email, ativo)
      VALUES (r.id, COALESCE(r.nome,'Aluno'), v_email, true)
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;
