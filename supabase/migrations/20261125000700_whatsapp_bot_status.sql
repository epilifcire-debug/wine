-- Situação da conexão do bot de WhatsApp (uma linha só).
-- O bot envia o estado e o QR Code pelo app (/api/public/whatsapp/status, com token);
-- só administradores leem. O QR aparece em Administração Master → WhatsApp do bot.
CREATE TABLE IF NOT EXISTS public.whatsapp_bot_status (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  estado text NOT NULL DEFAULT 'desconhecido'
    CHECK (estado IN ('desconhecido', 'conectado', 'desconectado', 'aguardando_qr')),
  qr text,
  numero text,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.whatsapp_bot_status (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.whatsapp_bot_status ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.whatsapp_bot_status TO authenticated;
GRANT ALL ON public.whatsapp_bot_status TO service_role;
REVOKE INSERT, UPDATE, DELETE ON public.whatsapp_bot_status FROM authenticated, anon;

DROP POLICY IF EXISTS whatsapp_bot_status_admin ON public.whatsapp_bot_status;
CREATE POLICY whatsapp_bot_status_admin ON public.whatsapp_bot_status
  FOR SELECT TO authenticated USING (private.is_admin());
