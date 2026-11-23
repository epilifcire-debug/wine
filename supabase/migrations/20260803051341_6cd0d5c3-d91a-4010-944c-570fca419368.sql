-- 1. Private schema for internal helpers (not exposed via API)
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT private.has_role(auth.uid(), 'admin')
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated, anon, service_role;

-- 2. Recreate policies to use private.is_admin()
-- alunos
DROP POLICY IF EXISTS alunos_delete_admin ON public.alunos;
DROP POLICY IF EXISTS alunos_insert_admin_or_self ON public.alunos;
DROP POLICY IF EXISTS alunos_select_own_or_admin ON public.alunos;
DROP POLICY IF EXISTS alunos_update_own_or_admin ON public.alunos;
CREATE POLICY alunos_delete_admin ON public.alunos FOR DELETE TO authenticated USING (private.is_admin());
CREATE POLICY alunos_insert_admin_or_self ON public.alunos FOR INSERT TO authenticated WITH CHECK (private.is_admin() OR user_id = auth.uid());
CREATE POLICY alunos_select_own_or_admin ON public.alunos FOR SELECT TO authenticated USING (user_id = auth.uid() OR private.is_admin());
CREATE POLICY alunos_update_own_or_admin ON public.alunos FOR UPDATE TO authenticated USING (user_id = auth.uid() OR private.is_admin()) WITH CHECK (user_id = auth.uid() OR private.is_admin());

-- alunos_sensiveis
DROP POLICY IF EXISTS sensiveis_admin_only ON public.alunos_sensiveis;
CREATE POLICY sensiveis_admin_only ON public.alunos_sensiveis FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

-- checkin_codigos
DROP POLICY IF EXISTS codigos_admin_all ON public.checkin_codigos;
CREATE POLICY codigos_admin_all ON public.checkin_codigos FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

-- exercicios_biblioteca
DROP POLICY IF EXISTS biblioteca_write_admin ON public.exercicios_biblioteca;
CREATE POLICY biblioteca_write_admin ON public.exercicios_biblioteca FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

-- horarios
DROP POLICY IF EXISTS horarios_write_admin ON public.horarios;
CREATE POLICY horarios_write_admin ON public.horarios FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

-- modalidades
DROP POLICY IF EXISTS modalidades_write_admin ON public.modalidades;
CREATE POLICY modalidades_write_admin ON public.modalidades FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

-- notificacoes
DROP POLICY IF EXISTS notificacoes_write_admin ON public.notificacoes;
CREATE POLICY notificacoes_write_admin ON public.notificacoes FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

-- presencas
DROP POLICY IF EXISTS presencas_select_own_or_admin ON public.presencas;
DROP POLICY IF EXISTS presencas_write_admin ON public.presencas;
DROP POLICY IF EXISTS presencas_insert_own ON public.presencas;
CREATE POLICY presencas_select_own_or_admin ON public.presencas FOR SELECT TO authenticated
  USING (private.is_admin() OR EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = presencas.aluno_id AND a.user_id = auth.uid()));
CREATE POLICY presencas_write_admin ON public.presencas FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY presencas_insert_own ON public.presencas FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = presencas.aluno_id AND a.user_id = auth.uid()));

-- reservas
DROP POLICY IF EXISTS reservas_delete_own_or_admin ON public.reservas;
DROP POLICY IF EXISTS reservas_insert_own_or_admin ON public.reservas;
DROP POLICY IF EXISTS reservas_select_own_or_admin ON public.reservas;
DROP POLICY IF EXISTS reservas_update_own_or_admin ON public.reservas;
CREATE POLICY reservas_delete_own_or_admin ON public.reservas FOR DELETE TO authenticated
  USING (private.is_admin() OR EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = reservas.aluno_id AND a.user_id = auth.uid()));
CREATE POLICY reservas_insert_own_or_admin ON public.reservas FOR INSERT TO authenticated
  WITH CHECK (private.is_admin() OR EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = reservas.aluno_id AND a.user_id = auth.uid()));
CREATE POLICY reservas_select_own_or_admin ON public.reservas FOR SELECT TO authenticated
  USING (private.is_admin() OR EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = reservas.aluno_id AND a.user_id = auth.uid()));
CREATE POLICY reservas_update_own_or_admin ON public.reservas FOR UPDATE TO authenticated
  USING (private.is_admin() OR EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = reservas.aluno_id AND a.user_id = auth.uid()))
  WITH CHECK (private.is_admin() OR EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = reservas.aluno_id AND a.user_id = auth.uid()));

-- treinos
DROP POLICY IF EXISTS treinos_write_admin ON public.treinos;
CREATE POLICY treinos_write_admin ON public.treinos FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

-- profiles
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
DROP POLICY IF EXISTS profiles_select_own_or_admin ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own_or_admin ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid() OR private.is_admin());
CREATE POLICY profiles_select_own_or_admin ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR private.is_admin());
CREATE POLICY profiles_update_own_or_admin ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR private.is_admin()) WITH CHECK (id = auth.uid() OR private.is_admin());

-- user_roles
DROP POLICY IF EXISTS user_roles_select_own_or_admin ON public.user_roles;
CREATE POLICY user_roles_select_own_or_admin ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR private.is_admin());

-- 3. Drop unused / exposed SECURITY DEFINER functions in public
-- storage policies depending on public.is_admin()
DROP POLICY IF EXISTS avatars_select_own ON storage.objects;
DROP POLICY IF EXISTS avatars_insert_admin ON storage.objects;
DROP POLICY IF EXISTS avatars_update_admin ON storage.objects;
DROP POLICY IF EXISTS avatars_delete_admin ON storage.objects;
CREATE POLICY avatars_select_own ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND ((storage.foldername(name))[1] = auth.uid()::text OR private.is_admin()));
CREATE POLICY avatars_insert_admin ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND private.is_admin());
CREATE POLICY avatars_update_admin ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND private.is_admin()) WITH CHECK (bucket_id = 'avatars' AND private.is_admin());
CREATE POLICY avatars_delete_admin ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND private.is_admin());

DROP FUNCTION IF EXISTS public.fazer_checkin(text);
DROP FUNCTION IF EXISTS public.vagas_ocupadas(uuid);
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- 4. Student check-in no longer needs elevated privileges
CREATE OR REPLACE FUNCTION public.fazer_checkin_simples()
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
DECLARE v_aluno uuid; v_horario uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Não autenticado.');
  END IF;
  SELECT id INTO v_aluno FROM public.alunos WHERE user_id = auth.uid();
  IF v_aluno IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Ficha de aluno não encontrada.');
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.presencas
    WHERE aluno_id = v_aluno
      AND data_checkin >= date_trunc('day', now())
      AND data_checkin < date_trunc('day', now()) + interval '1 day'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Presença já registrada hoje.');
  END IF;

  SELECT h.id INTO v_horario
  FROM public.reservas r
  JOIN public.horarios h ON h.id = r.horario_id
  WHERE r.aluno_id = v_aluno AND r.status = 'confirmada'
    AND h.data = current_date AND h.cancelada = false
  ORDER BY h.horario ASC
  LIMIT 1;

  INSERT INTO public.presencas (aluno_id, horario_id) VALUES (v_aluno, v_horario);
  RETURN jsonb_build_object('ok', true, 'message', 'Presença confirmada!');
END; $$;

REVOKE ALL ON FUNCTION public.fazer_checkin_simples() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fazer_checkin_simples() TO authenticated;