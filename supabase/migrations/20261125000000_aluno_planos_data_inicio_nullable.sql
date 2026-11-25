-- Contrato aguardando pagamento ainda não tem data de início (preenchida ao confirmar o pagamento).
ALTER TABLE public.aluno_planos ALTER COLUMN data_inicio DROP NOT NULL;
