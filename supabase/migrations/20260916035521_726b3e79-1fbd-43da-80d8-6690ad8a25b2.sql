CREATE OR REPLACE FUNCTION public.protect_admin_master()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_email text;
BEGIN
  SELECT lower(email) INTO v_email
  FROM auth.users
  WHERE id = COALESCE(OLD.user_id, NEW.user_id);

  IF v_email = 'epilif.cire@gmail.com'
     AND TG_OP <> 'INSERT'
     AND OLD.role = 'admin_master' THEN
    RAISE EXCEPTION 'O papel do Administrador Master não pode ser alterado.';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
REVOKE ALL ON FUNCTION public.protect_admin_master() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = 'epilif.cire@gmail.com'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    -- Banco novo: a conta ainda não existe. Rode docs/admin/admin-master.sql depois do cadastro.
    RAISE NOTICE 'Conta Administrador Master ainda não existe; pulando.';
    RETURN;
  END IF;

  DELETE FROM public.user_roles
  WHERE user_id = v_user_id
    AND role <> 'admin_master';

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin_master')
  ON CONFLICT (user_id, role) DO NOTHING;

  UPDATE public.alunos
  SET ativo = false
  WHERE user_id = v_user_id;
END
$$;