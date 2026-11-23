ALTER TABLE public.planos
  ADD COLUMN IF NOT EXISTS forma_pagamento text NOT NULL DEFAULT 'PIX',
  ADD COLUMN IF NOT EXISTS duracao_meses integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS limite_mensal integer,
  ADD COLUMN IF NOT EXISTS acesso_livre boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS beneficios text,
  ADD COLUMN IF NOT EXISTS regras_acesso text,
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'recorrente';