CREATE OR REPLACE FUNCTION public.fazer_checkin_simples()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

REVOKE EXECUTE ON FUNCTION public.fazer_checkin_simples() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fazer_checkin_simples() TO authenticated;