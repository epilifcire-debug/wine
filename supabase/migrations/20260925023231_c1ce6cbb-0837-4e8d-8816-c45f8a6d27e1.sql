CREATE UNIQUE INDEX IF NOT EXISTS aluno_planos_pendente_unico_por_aluno_uidx
  ON public.aluno_planos (aluno_id)
  WHERE status = 'aguardando_pagamento'::public.contrato_status;

GRANT SELECT ON public.pagamentos TO authenticated;
GRANT ALL ON public.pagamentos TO service_role;
REVOKE INSERT, UPDATE, DELETE ON public.pagamentos FROM authenticated, anon;

DROP POLICY IF EXISTS pagamentos_select_own_or_admin ON public.pagamentos;
CREATE POLICY pagamentos_select_own_or_admin
ON public.pagamentos
FOR SELECT
TO authenticated
USING (
  private.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.alunos a
    WHERE a.id = pagamentos.aluno_id
      AND a.user_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.ativar_plano(p_plano_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_aluno_id uuid;
  v_ativo boolean;
  v_preco integer;
  v_tipo text;
  v_contrato_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  v_aluno_id := public.ensure_current_student();
  IF v_aluno_id IS NULL THEN
    RAISE EXCEPTION 'NO_STUDENT_RECORD: Não foi possível localizar sua ficha de aluno.';
  END IF;

  SELECT p.ativo, p.preco_centavos, p.tipo
    INTO v_ativo, v_preco, v_tipo
  FROM public.planos p
  WHERE p.id = p_plano_id;

  IF v_ativo IS DISTINCT FROM true OR v_tipo = 'avulso' THEN
    RAISE EXCEPTION 'PLAN_NOT_AVAILABLE: Este plano não está disponível.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('selecao-plano:' || v_aluno_id::text, 0));

  SELECT ap.id
    INTO v_contrato_id
  FROM public.aluno_planos ap
  WHERE ap.aluno_id = v_aluno_id
    AND ap.status = 'aguardando_pagamento'
  FOR UPDATE;

  IF v_contrato_id IS NULL THEN
    INSERT INTO public.aluno_planos (
      aluno_id, plano_id, data_inicio, data_fim, proximo_vencimento,
      valor_centavos, status, observacao
    ) VALUES (
      v_aluno_id, p_plano_id, NULL, NULL, NULL,
      COALESCE(v_preco, 0), 'aguardando_pagamento', 'Pagamento presencial pendente'
    )
    RETURNING id INTO v_contrato_id;
  ELSE
    UPDATE public.aluno_planos
       SET plano_id = p_plano_id,
           data_inicio = NULL,
           data_fim = NULL,
           proximo_vencimento = NULL,
           valor_centavos = COALESCE(v_preco, 0),
           observacao = 'Pagamento presencial pendente'
     WHERE id = v_contrato_id;
  END IF;

  RETURN v_contrato_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ativar_plano(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ativar_plano(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.registrar_pagamento_presencial(p_aluno_plano_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_contrato public.aluno_planos%ROWTYPE;
  v_plano public.planos%ROWTYPE;
  v_user_id uuid;
  v_inicio date;
  v_vencimento date;
  v_pagamento_id uuid;
  v_vencimento_atual date;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED: Apenas administradores podem confirmar pagamentos.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('pagamento-plano:' || p_aluno_plano_id::text, 0));

  SELECT * INTO v_contrato
  FROM public.aluno_planos
  WHERE id = p_aluno_plano_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PLAN_CONTRACT_NOT_FOUND';
  END IF;
  IF v_contrato.status <> 'aguardando_pagamento' THEN
    IF EXISTS (
      SELECT 1 FROM public.pagamentos p
      WHERE p.aluno_plano_id = p_aluno_plano_id AND p.status = 'pago'
    ) THEN
      RAISE EXCEPTION 'PAYMENT_ALREADY_REGISTERED';
    END IF;
    RAISE EXCEPTION 'PAYMENT_NOT_PENDING';
  END IF;

  SELECT * INTO v_plano
  FROM public.planos
  WHERE id = v_contrato.plano_id;
  IF NOT FOUND OR v_plano.ativo IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'PLAN_NOT_AVAILABLE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.pagamentos p
    WHERE p.aluno_plano_id = p_aluno_plano_id AND p.status = 'pago'
  ) THEN
    RAISE EXCEPTION 'PAYMENT_ALREADY_REGISTERED';
  END IF;

  SELECT a.user_id INTO v_user_id
  FROM public.alunos a
  WHERE a.id = v_contrato.aluno_id;

  SELECT max(COALESCE(ap.proximo_vencimento, ap.data_fim))
    INTO v_vencimento_atual
  FROM public.aluno_planos ap
  WHERE ap.aluno_id = v_contrato.aluno_id
    AND ap.status IN ('ativo', 'proximo_vencimento')
    AND ap.plano_id = v_contrato.plano_id
    AND ap.id <> v_contrato.id;

  v_inicio := GREATEST(CURRENT_DATE, COALESCE(v_vencimento_atual, CURRENT_DATE));
  v_vencimento := (v_inicio + (GREATEST(COALESCE(v_plano.duracao_meses, 1), 1) || ' months')::interval)::date;

  UPDATE public.aluno_planos
     SET status = 'cancelado',
         data_fim = COALESCE(data_fim, CURRENT_DATE)
   WHERE aluno_id = v_contrato.aluno_id
     AND id <> v_contrato.id
     AND status IN ('ativo', 'proximo_vencimento', 'vencido');

  UPDATE public.aluno_planos
     SET status = 'ativo',
         data_inicio = v_inicio,
         data_fim = v_vencimento,
         proximo_vencimento = v_vencimento,
         observacao = 'Pagamento presencial confirmado'
   WHERE id = v_contrato.id;

  INSERT INTO public.pagamentos (
    aluno_id, user_id, plano_id, aluno_plano_id, valor_centavos,
    forma_pagamento, origem, status, pago_em, registrado_por,
    provedor, id_externo, chave_idempotencia
  ) VALUES (
    v_contrato.aluno_id, v_user_id, v_contrato.plano_id, v_contrato.id,
    v_contrato.valor_centavos, 'presencial', 'manual', 'pago', now(), auth.uid(),
    NULL, NULL, 'mensalidade:' || v_contrato.id::text
  )
  RETURNING id INTO v_pagamento_id;

  UPDATE public.alunos
     SET plano_id = v_contrato.plano_id
   WHERE id = v_contrato.aluno_id;

  RETURN v_pagamento_id;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_pagamento_presencial(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_pagamento_presencial(uuid) TO authenticated;