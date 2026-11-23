ALTER TABLE public.alunos
  ADD COLUMN IF NOT EXISTS genero text;

ALTER TABLE public.alunos
  DROP CONSTRAINT IF EXISTS alunos_genero_check;

ALTER TABLE public.alunos
  ADD CONSTRAINT alunos_genero_check
  CHECK (genero IS NULL OR genero IN ('masculino','feminino','neutro'));