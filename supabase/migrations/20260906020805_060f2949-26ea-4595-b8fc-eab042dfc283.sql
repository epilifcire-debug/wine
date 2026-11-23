CREATE TYPE public.day_use_status AS ENUM ('aguardando_pagamento','disponivel','reservado','utilizado','vencido','cancelado');

CREATE TABLE public.day_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  plano_id uuid REFERENCES public.planos(id),
  valor_centavos integer NOT NULL DEFAULT 0,
  status public.day_use_status NOT NULL DEFAULT 'aguardando_pagamento',
  validade date,
  reserva_id uuid REFERENCES public.reservas(id) ON DELETE SET NULL,
  utilizado_em timestamptz,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX day_uses_reserva_unico ON public.day_uses (reserva_id) WHERE reserva_id IS NOT NULL;
CREATE INDEX day_uses_aluno_idx ON public.day_uses (aluno_id, status);

GRANT SELECT, INSERT, UPDATE ON public.day_uses TO authenticated;
GRANT ALL ON public.day_uses TO service_role;

ALTER TABLE public.day_uses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Aluno vê seus day uses" ON public.day_uses FOR SELECT TO authenticated
USING (private.is_admin() OR aluno_id IN (SELECT a.id FROM public.alunos a WHERE a.user_id = auth.uid()));

CREATE POLICY "Admin gerencia day uses" ON public.day_uses FOR ALL TO authenticated
USING (private.is_admin()) WITH CHECK (private.is_admin());

CREATE TRIGGER trg_day_uses_updated BEFORE UPDATE ON public.day_uses
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- compra de day use pelo próprio aluno
CREATE OR REPLACE FUNCTION public.comprar_day_use(p_plano_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_aluno_id uuid; v_preco integer; v_ativo boolean; v_tipo text; v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  v_aluno_id := public.ensure_current_student();
  IF v_aluno_id IS NULL THEN RAISE EXCEPTION 'NO_STUDENT_RECORD'; END IF;

  SELECT p.ativo, p.preco_centavos, p.tipo INTO v_ativo, v_preco, v_tipo
  FROM public.planos p WHERE p.id = p_plano_id;

  IF v_ativo IS DISTINCT FROM true OR v_tipo <> 'avulso' THEN
    RAISE EXCEPTION 'PLAN_NOT_AVAILABLE';
  END IF;

  INSERT INTO public.day_uses (aluno_id, plano_id, valor_centavos, status, validade, observacao)
  VALUES (v_aluno_id, p_plano_id, COALESCE(v_preco,0), 'aguardando_pagamento',
          (CURRENT_DATE + interval '30 days')::date, 'Aguardando pagamento')
  RETURNING id INTO v_id;

  RETURN v_id;
END; $$;

REVOKE EXECUTE ON FUNCTION public.comprar_day_use(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.comprar_day_use(uuid) TO authenticated;

-- validação de reserva considerando day use
CREATE OR REPLACE FUNCTION public.check_limite_semanal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_plano_id uuid; v_ativo boolean; v_limite integer;
  v_data date; v_ini date; v_count integer; v_venc date;
  v_day_use uuid; v_plano_ok boolean := false;
BEGIN
  IF NEW.status <> 'confirmada' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'confirmada' THEN RETURN NEW; END IF;

  SELECT h.data INTO v_data FROM public.horarios h WHERE h.id = NEW.horario_id;

  SELECT a.plano_id INTO v_plano_id FROM public.alunos a WHERE a.id = NEW.aluno_id;

  IF v_plano_id IS NOT NULL THEN
    SELECT p.limite_semanal, p.ativo INTO v_limite, v_ativo FROM public.planos p WHERE p.id = v_plano_id;

    SELECT COALESCE(ap.proximo_vencimento, ap.data_fim) INTO v_venc
    FROM public.aluno_planos ap
    WHERE ap.aluno_id = NEW.aluno_id AND ap.status <> 'cancelado'
    ORDER BY ap.data_inicio DESC, ap.created_at DESC LIMIT 1;

    IF v_ativo IS true AND (v_venc IS NULL OR v_venc >= CURRENT_DATE) THEN
      IF v_limite IS NULL THEN
        v_plano_ok := true;
      ELSE
        v_ini := date_trunc('week', COALESCE(v_data, CURRENT_DATE)::timestamp)::date;
        SELECT count(*) INTO v_count
        FROM public.reservas r
        JOIN public.horarios h ON h.id = r.horario_id
        WHERE r.aluno_id = NEW.aluno_id AND r.status = 'confirmada' AND r.id <> NEW.id
          AND h.cancelada = false AND h.data >= v_ini AND h.data < v_ini + 7
          AND NOT EXISTS (SELECT 1 FROM public.day_uses d WHERE d.reserva_id = r.id);
        IF v_count < v_limite THEN v_plano_ok := true; END IF;
      END IF;
    END IF;
  END IF;

  IF v_plano_ok THEN RETURN NEW; END IF;

  -- tenta consumir um day use disponível
  UPDATE public.day_uses d
     SET status = 'vencido'
   WHERE d.aluno_id = NEW.aluno_id AND d.status = 'disponivel'
     AND d.validade IS NOT NULL AND d.validade < CURRENT_DATE;

  SELECT d.id INTO v_day_use
  FROM public.day_uses d
  WHERE d.aluno_id = NEW.aluno_id AND d.status = 'disponivel'
  ORDER BY d.validade NULLS LAST, d.created_at
  LIMIT 1
  FOR UPDATE;

  IF v_day_use IS NOT NULL THEN
    UPDATE public.day_uses
       SET status = 'reservado', reserva_id = NEW.id, utilizado_em = now()
     WHERE id = v_day_use;
    RETURN NEW;
  END IF;

  IF v_plano_id IS NULL OR v_ativo IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'NO_ACTIVE_PLAN: Você ainda não possui um plano ativo. Escolha um plano ou compre um Day Use para reservar sua aula.';
  END IF;

  IF v_venc IS NOT NULL AND v_venc < CURRENT_DATE THEN
    RAISE EXCEPTION 'PLAN_EXPIRED: Seu plano está vencido. Renove seu plano para voltar a reservar aulas.';
  END IF;

  RAISE EXCEPTION 'WEEKLY_PLAN_LIMIT_REACHED: Seu plano permite até % aula(s) por semana. Para realizar mais aulas, faça upgrade do seu plano ou compre um Day Use.', v_limite;
END; $$;

-- devolve o day use quando a reserva é cancelada
CREATE OR REPLACE FUNCTION public.devolver_day_use()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status = 'cancelada' AND OLD.status <> 'cancelada' THEN
    UPDATE public.day_uses
       SET status = CASE WHEN validade IS NOT NULL AND validade < CURRENT_DATE THEN 'vencido'::public.day_use_status
                         ELSE 'disponivel'::public.day_use_status END,
           reserva_id = NULL,
           utilizado_em = NULL
     WHERE reserva_id = NEW.id AND status = 'reservado';
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_devolver_day_use AFTER UPDATE ON public.reservas
FOR EACH ROW EXECUTE FUNCTION public.devolver_day_use();