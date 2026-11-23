ALTER FUNCTION public.reativar_reserva(uuid) SECURITY INVOKER;

DROP POLICY IF EXISTS whatsapp_notifications_no_app_access ON public.whatsapp_notifications;
CREATE POLICY whatsapp_notifications_no_app_access
  ON public.whatsapp_notifications
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);