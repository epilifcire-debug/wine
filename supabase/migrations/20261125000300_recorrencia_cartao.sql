-- Recorrência no cartão de crédito (só planos com valor de recorrência, ou seja, trimestrais).
-- O aluno pede a recorrência ao escolher o plano; o admin ativa a chave depois de
-- configurar a cobrança no cartão. O cadastro do aluno mostra o sinalizador.

ALTER TABLE public.aluno_planos
  ADD COLUMN IF NOT EXISTS recorrencia_solicitada boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recorrencia_ativa boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recorrencia_ativada_em timestamptz,
  ADD COLUMN IF NOT EXISTS recorrencia_ativada_por uuid;

-- Aluno: pedir (ou desistir) da recorrência no próprio contrato.
CREATE OR REPLACE FUNCTION public.solicitar_recorrencia(p_aluno_plano_id uuid, p_solicitar boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_aluno text;
  v_plano text;
  v_preco_rec integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT a.nome, p.nome, p.preco_recorrencia_centavos
    INTO v_aluno, v_plano, v_preco_rec
  FROM public.aluno_planos ap
  JOIN public.alunos a ON a.id = ap.aluno_id
  LEFT JOIN public.planos p ON p.id = ap.plano_id
  WHERE ap.id = p_aluno_plano_id AND a.user_id = auth.uid()
    AND ap.status IN ('aguardando_pagamento', 'ativo', 'proximo_vencimento');
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_AUTHORIZED: Contrato não encontrado.'; END IF;
  IF p_solicitar AND COALESCE(v_preco_rec, 0) <= 0 THEN
    RAISE EXCEPTION 'RECURRENCE_NOT_AVAILABLE: Este plano não tem recorrência.';
  END IF;

  UPDATE public.aluno_planos
     SET recorrencia_solicitada = p_solicitar,
         recorrencia_ativa = CASE WHEN p_solicitar THEN recorrencia_ativa ELSE false END
   WHERE id = p_aluno_plano_id;

  IF p_solicitar THEN
    INSERT INTO public.notificacoes (titulo, mensagem, tipo)
    VALUES (
      'Recorrência no cartão solicitada',
      coalesce(v_aluno, 'Um aluno') || ' quer deixar o plano ' || coalesce(v_plano, '') ||
        ' recorrente no cartão. Ative a chave em Financeiro depois de configurar a cobrança.',
      'admin_plano_pendente'
    );
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.solicitar_recorrencia(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.solicitar_recorrencia(uuid, boolean) TO authenticated;

-- Admin: ativar ou desativar a chave da recorrência.
CREATE OR REPLACE FUNCTION public.definir_recorrencia(p_aluno_plano_id uuid, p_ativa boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED: Apenas administradores podem ativar a recorrência.';
  END IF;
  UPDATE public.aluno_planos
     SET recorrencia_ativa = p_ativa,
         recorrencia_solicitada = CASE WHEN p_ativa THEN true ELSE recorrencia_solicitada END,
         recorrencia_ativada_em = CASE WHEN p_ativa THEN now() ELSE NULL END,
         recorrencia_ativada_por = CASE WHEN p_ativa THEN auth.uid() ELSE NULL END
   WHERE id = p_aluno_plano_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND: Contrato não encontrado.'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.definir_recorrencia(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.definir_recorrencia(uuid, boolean) TO authenticated;
