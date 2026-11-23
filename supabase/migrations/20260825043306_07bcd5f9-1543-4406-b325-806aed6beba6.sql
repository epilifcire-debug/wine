CREATE TABLE public.whatsapp_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reserva_id uuid NOT NULL
    REFERENCES public.reservas(id)
    ON DELETE CASCADE,
  tipo text NOT NULL
    CHECK (tipo IN ('confirmacao', 'lembrete')),
  enviado_em timestamptz NOT NULL DEFAULT now(),
  telefone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reserva_id, tipo)
);

GRANT ALL ON public.whatsapp_notifications TO service_role;

ALTER TABLE public.whatsapp_notifications ENABLE ROW LEVEL SECURITY;