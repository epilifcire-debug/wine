CREATE OR REPLACE FUNCTION public.check_limite_semanal()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_plano_id uuid;
  v_ativo boolean;
  v_limite integer;
  v_nome text;
  v_data date;
  v_ini date;
  v_count integer;
BEGIN
  IF NEW.status <> 'confirmada' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'confirmada' THEN RETURN NEW; END IF;

  SELECT a.plano_id INTO v_plano_id FROM public.alunos a WHERE a.id = NEW.aluno_id;

  IF v_plano_id IS NULL THEN
    RAISE EXCEPTION 'NO_ACTIVE_PLAN: Você ainda não possui um plano ativo. Escolha um plano para poder reservar suas aulas.';
  END IF;

  SELECT p.limite_semanal, p.nome, p.ativo INTO v_limite, v_nome, v_ativo
  FROM public.planos p WHERE p.id = v_plano_id;

  IF v_ativo IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'NO_ACTIVE_PLAN: Você ainda não possui um plano ativo. Escolha um plano para poder reservar suas aulas.';
  END IF;

  IF v_limite IS NULL THEN RETURN NEW; END IF;

  SELECT h.data INTO v_data FROM public.horarios h WHERE h.id = NEW.horario_id;
  IF v_data IS NULL THEN RETURN NEW; END IF;
  v_ini := date_trunc('week', v_data::timestamp)::date;

  SELECT count(*) INTO v_count
  FROM public.reservas r
  JOIN public.horarios h ON h.id = r.horario_id
  WHERE r.aluno_id = NEW.aluno_id
    AND r.status = 'confirmada'
    AND r.id <> NEW.id
    AND h.cancelada = false
    AND h.data >= v_ini
    AND h.data < v_ini + 7;

  IF v_count >= v_limite THEN
    RAISE EXCEPTION 'WEEKLY_PLAN_LIMIT_REACHED: Seu plano permite até % aula(s) por semana. Para realizar mais aulas, faça upgrade do seu plano.', v_limite;
  END IF;

  RETURN NEW;
END; $function$;