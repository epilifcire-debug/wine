-- 1. Ativação/troca de plano validada no servidor
CREATE OR REPLACE FUNCTION public.ativar_plano(p_plano_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_aluno_id uuid;
  v_ativo boolean;
  v_preco integer;
  v_dur integer;
  v_contrato_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  v_aluno_id := public.ensure_current_student();
  IF v_aluno_id IS NULL THEN
    RAISE EXCEPTION 'NO_STUDENT_RECORD: Não foi possível localizar sua ficha de aluno.';
  END IF;

  SELECT p.ativo, p.preco_centavos, GREATEST(COALESCE(p.duracao_meses, 1), 1)
    INTO v_ativo, v_preco, v_dur
  FROM public.planos p WHERE p.id = p_plano_id;

  IF v_ativo IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'PLAN_NOT_AVAILABLE: Este plano não está disponível.';
  END IF;

  -- encerra contratos vigentes anteriores (mantém histórico)
  UPDATE public.aluno_planos
     SET status = 'cancelado', data_fim = COALESCE(data_fim, CURRENT_DATE)
   WHERE aluno_id = v_aluno_id AND status <> 'cancelado';

  INSERT INTO public.aluno_planos
    (aluno_id, plano_id, data_inicio, proximo_vencimento, valor_centavos, status, observacao)
  VALUES
    (v_aluno_id, p_plano_id, CURRENT_DATE, (CURRENT_DATE + (v_dur || ' months')::interval)::date,
     COALESCE(v_preco, 0), 'ativo', 'Aguardando pagamento')
  RETURNING id INTO v_contrato_id;

  -- vincula o plano à ficha (dispara o log de histórico existente)
  UPDATE public.alunos SET plano_id = p_plano_id WHERE id = v_aluno_id;

  RETURN v_contrato_id;
END; $$;

REVOKE EXECUTE ON FUNCTION public.ativar_plano(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.ativar_plano(uuid) TO authenticated;

-- 2. Bloqueio de reserva com contrato vencido
CREATE OR REPLACE FUNCTION public.check_limite_semanal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plano_id uuid;
  v_ativo boolean;
  v_limite integer;
  v_nome text;
  v_data date;
  v_ini date;
  v_count integer;
  v_venc date;
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

  -- contrato vigente vencido bloqueia novas reservas
  SELECT COALESCE(ap.proximo_vencimento, ap.data_fim) INTO v_venc
  FROM public.aluno_planos ap
  WHERE ap.aluno_id = NEW.aluno_id AND ap.status <> 'cancelado'
  ORDER BY ap.data_inicio DESC, ap.created_at DESC
  LIMIT 1;

  IF v_venc IS NOT NULL AND v_venc < CURRENT_DATE THEN
    RAISE EXCEPTION 'PLAN_EXPIRED: Seu plano está vencido. Renove seu plano para voltar a reservar aulas.';
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
END; $$;