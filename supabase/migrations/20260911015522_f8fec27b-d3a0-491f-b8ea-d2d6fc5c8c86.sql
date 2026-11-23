CREATE OR REPLACE FUNCTION private.professor_do_aluno(_aluno_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.reservas r
    JOIN public.horarios h ON h.id = r.horario_id
    WHERE r.aluno_id = _aluno_id
      AND h.professor_user_id = auth.uid()
  )
$$;

DROP POLICY IF EXISTS alunos_select_professor ON public.alunos;

CREATE POLICY alunos_select_professor ON public.alunos
FOR SELECT TO authenticated
USING (private.professor_do_aluno(id));