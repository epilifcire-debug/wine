-- 1. Sequência e gerador do ID público WBC
CREATE SEQUENCE IF NOT EXISTS public.wbc_codigo_seq START 1;

CREATE OR REPLACE FUNCTION public.gerar_codigo_wbc()
RETURNS text LANGUAGE sql VOLATILE SET search_path = public AS $$
  SELECT 'WBC-' || lpad(nextval('public.wbc_codigo_seq')::text, 6, '0');
$$;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS codigo_wbc text;
ALTER TABLE public.alunos   ADD COLUMN IF NOT EXISTS codigo_wbc text;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_codigo_wbc_key ON public.profiles(codigo_wbc);
CREATE UNIQUE INDEX IF NOT EXISTS alunos_codigo_wbc_key   ON public.alunos(codigo_wbc);

-- 2. Backfill dos cadastros antigos (ordem cronológica, sem alterar códigos já existentes)
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE codigo_wbc IS NULL ORDER BY created_at, id LOOP
    UPDATE public.profiles SET codigo_wbc = public.gerar_codigo_wbc() WHERE id = r.id;
  END LOOP;
END $$;

-- fichas vinculadas herdam o código do perfil; fichas sem conta recebem um novo
UPDATE public.alunos a
   SET codigo_wbc = p.codigo_wbc
  FROM public.profiles p
 WHERE a.user_id = p.id AND a.codigo_wbc IS NULL AND p.codigo_wbc IS NOT NULL;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.alunos WHERE codigo_wbc IS NULL ORDER BY created_at, id LOOP
    UPDATE public.alunos SET codigo_wbc = public.gerar_codigo_wbc() WHERE id = r.id;
  END LOOP;
END $$;

-- 3. Triggers de atribuição automática
CREATE OR REPLACE FUNCTION public.set_codigo_wbc_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.codigo_wbc IS NULL THEN
    NEW.codigo_wbc := COALESCE(
      (SELECT a.codigo_wbc FROM public.alunos a WHERE a.user_id = NEW.id AND a.codigo_wbc IS NOT NULL LIMIT 1),
      public.gerar_codigo_wbc());
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_set_codigo_wbc_profile ON public.profiles;
CREATE TRIGGER trg_set_codigo_wbc_profile BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_codigo_wbc_profile();

CREATE OR REPLACE FUNCTION public.set_codigo_wbc_aluno()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.codigo_wbc IS NULL THEN
    NEW.codigo_wbc := COALESCE(
      (SELECT p.codigo_wbc FROM public.profiles p WHERE p.id = NEW.user_id AND p.codigo_wbc IS NOT NULL),
      public.gerar_codigo_wbc());
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_set_codigo_wbc_aluno ON public.alunos;
CREATE TRIGGER trg_set_codigo_wbc_aluno BEFORE INSERT OR UPDATE OF user_id ON public.alunos
FOR EACH ROW EXECUTE FUNCTION public.set_codigo_wbc_aluno();

-- 4. Ficha garantida para toda conta com papel de aluno
CREATE OR REPLACE FUNCTION public.sincronizar_ficha_aluno(p_user_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_nome text; v_email text;
BEGIN
  IF p_user_id IS NULL THEN RETURN NULL; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p_user_id AND r.role = 'admin')
     AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p_user_id AND r.role = 'aluno') THEN
    RETURN NULL;
  END IF;

  SELECT a.id INTO v_id FROM public.alunos a WHERE a.user_id = p_user_id;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  SELECT lower(u.email),
         COALESCE(u.raw_user_meta_data->>'nome', u.raw_user_meta_data->>'full_name',
                  u.raw_user_meta_data->>'name', split_part(u.email,'@',1))
    INTO v_email, v_nome
  FROM auth.users u WHERE u.id = p_user_id;

  -- reaproveita ficha antiga sem conta, quando o e-mail bate de forma única
  IF v_email IS NOT NULL THEN
    UPDATE public.alunos a SET user_id = p_user_id
     WHERE a.user_id IS NULL AND lower(a.email) = v_email
       AND (SELECT count(*) FROM public.alunos b WHERE b.user_id IS NULL AND lower(b.email) = v_email) = 1
     RETURNING a.id INTO v_id;
    IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  END IF;

  INSERT INTO public.alunos (user_id, nome, email, ativo, plano_id)
  VALUES (p_user_id, COALESCE(v_nome,'Aluno'), v_email, true, NULL)
  ON CONFLICT (user_id) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT a.id INTO v_id FROM public.alunos a WHERE a.user_id = p_user_id;
  END IF;
  RETURN v_id;
END $$;

REVOKE EXECUTE ON FUNCTION public.sincronizar_ficha_aluno(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.sincronizar_ficha_aluno(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.trg_sync_ficha_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role = 'aluno' THEN
    PERFORM public.sincronizar_ficha_aluno(NEW.user_id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_user_roles_sync_ficha ON public.user_roles;
CREATE TRIGGER trg_user_roles_sync_ficha AFTER INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_ficha_role();

-- backfill das contas com papel de aluno que estavam sem ficha
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT user_id FROM public.user_roles WHERE role = 'aluno' LOOP
    PERFORM public.sincronizar_ficha_aluno(r.user_id);
  END LOOP;
END $$;

-- 5. Auditoria de mudanças de perfil
CREATE TABLE IF NOT EXISTS public.role_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  codigo_wbc text,
  email text,
  perfil_anterior text,
  perfil_novo text,
  alterado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.role_change_log TO authenticated;
GRANT ALL ON public.role_change_log TO service_role;
ALTER TABLE public.role_change_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS role_change_log_master_select ON public.role_change_log;
CREATE POLICY role_change_log_master_select ON public.role_change_log
FOR SELECT TO authenticated USING (private.is_admin_master());

CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid; v_email text; v_codigo text;
BEGIN
  v_uid := COALESCE(NEW.user_id, OLD.user_id);
  SELECT lower(u.email) INTO v_email FROM auth.users u WHERE u.id = v_uid;
  SELECT p.codigo_wbc INTO v_codigo FROM public.profiles p WHERE p.id = v_uid;

  INSERT INTO public.role_change_log (user_id, codigo_wbc, email, perfil_anterior, perfil_novo, alterado_por)
  VALUES (v_uid, v_codigo, v_email,
          CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.role::text END,
          CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.role::text END,
          auth.uid());
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_log_role_change ON public.user_roles;
CREATE TRIGGER trg_log_role_change AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.log_role_change();