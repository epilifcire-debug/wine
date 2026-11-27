-- Peças que existiam só no banco do Lovable e faltavam no repositório.
-- Sem isso as migrations não recriam o banco do zero. Idempotente: não muda bancos que já têm.
ALTER TYPE public.contrato_status ADD VALUE IF NOT EXISTS 'aguardando_pagamento';

CREATE TABLE IF NOT EXISTS public.pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid REFERENCES public.alunos(id) ON DELETE CASCADE,
  user_id uuid,
  plano_id uuid REFERENCES public.planos(id),
  aluno_plano_id uuid REFERENCES public.aluno_planos(id) ON DELETE CASCADE,
  valor_centavos integer NOT NULL DEFAULT 0,
  forma_pagamento text NOT NULL DEFAULT 'presencial',
  origem text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'pendente',
  pago_em timestamptz,
  registrado_por uuid,
  provedor text,
  id_externo text,
  chave_idempotencia text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;
