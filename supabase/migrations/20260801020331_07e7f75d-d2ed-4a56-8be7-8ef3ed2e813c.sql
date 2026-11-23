REVOKE ALL ON FUNCTION public.vagas_ocupadas(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  ) AND (
    -- only allow answering about the current user when called by a client role
    _user_id = auth.uid() OR auth.uid() IS NULL OR current_setting('role', true) = 'postgres'
  )
$$;

CREATE OR REPLACE FUNCTION public.fazer_checkin(_codigo text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_cod public.checkin_codigos%ROWTYPE; v_aluno uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Não autenticado.');
  END IF;
  IF _codigo IS NULL OR length(trim(_codigo)) < 3 OR length(trim(_codigo)) > 32 THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Código inválido.');
  END IF;
  SELECT id INTO v_aluno FROM public.alunos WHERE user_id = auth.uid();
  IF v_aluno IS NULL THEN RETURN jsonb_build_object('ok', false, 'message', 'Ficha de aluno não encontrada.'); END IF;
  SELECT * INTO v_cod FROM public.checkin_codigos WHERE upper(codigo) = upper(trim(_codigo));
  IF v_cod.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'message', 'Código inválido.'); END IF;
  IF NOT v_cod.ativo OR v_cod.valido_ate < now() THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Código expirado.');
  END IF;
  IF EXISTS (SELECT 1 FROM public.presencas WHERE aluno_id = v_aluno AND horario_id IS NOT DISTINCT FROM v_cod.horario_id) THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Check-in já realizado.');
  END IF;
  INSERT INTO public.presencas (aluno_id, horario_id, codigo_id) VALUES (v_aluno, v_cod.horario_id, v_cod.id);
  RETURN jsonb_build_object('ok', true, 'message', 'Check-in confirmado!');
END; $$;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.fazer_checkin(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fazer_checkin(text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.vagas_ocupadas(uuid) TO service_role;