-- Administrador Master (acesso total) — Wine Barbell Club
-- Executar no SQL Editor do Supabase, DEPOIS que a conta for criada pelo cadastro normal.
-- Substitua o e-mail pelo da conta do Administrador Master.
--
-- Observação: a migração 20260916035521 já concede o papel admin_master ao e-mail
-- epilif.cire@gmail.com e impede que esse papel seja alterado.
-- Use este bloco apenas em um banco novo (ex.: o projeto Supabase novo).

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower('epilif.cire@gmail.com')
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Crie a conta do Administrador Master antes (cadastro normal no app).';
  END IF;

  DELETE FROM public.user_roles WHERE user_id = v_user_id AND role <> 'admin_master';
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin_master')
  ON CONFLICT (user_id, role) DO NOTHING;

  UPDATE public.alunos SET ativo = false WHERE user_id = v_user_id;
END
$$;
