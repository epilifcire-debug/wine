-- 1) Novos papéis
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'professor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin_master';

-- 2) Helpers de permissão (comparação textual: valores de enum recém-criados
--    não podem ser referenciados na mesma transação)
CREATE OR REPLACE FUNCTION private.is_admin_master()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid() AND lower(u.email) = 'epilif.cire@gmail.com'
  )
$$;

CREATE OR REPLACE FUNCTION private.is_professor()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles r
    WHERE r.user_id = auth.uid() AND r.role::text = 'professor'
  )
$$;

REVOKE EXECUTE ON FUNCTION private.is_admin_master() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.is_professor() FROM anon, authenticated;

-- 3) Professor responsável pela aula
ALTER TABLE public.horarios
  ADD COLUMN IF NOT EXISTS professor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS horarios_professor_idx ON public.horarios(professor_user_id);

-- 4) Check-in e presença na reserva
ALTER TABLE public.reservas
  ADD COLUMN IF NOT EXISTS checkin_em timestamptz,
  ADD COLUMN IF NOT EXISTS presenca text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS presenca_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS presenca_em timestamptz;

ALTER TABLE public.reservas DROP CONSTRAINT IF EXISTS reservas_presenca_check;
ALTER TABLE public.reservas
  ADD CONSTRAINT reservas_presenca_check CHECK (presenca IN ('pendente','presente','falta'));

-- 5) Notificações do bot: aceitar tipo 'checkin'
ALTER TABLE public.whatsapp_notifications DROP CONSTRAINT IF EXISTS whatsapp_notifications_tipo_check;
ALTER TABLE public.whatsapp_notifications
  ADD CONSTRAINT whatsapp_notifications_tipo_check
  CHECK (tipo IN ('confirmacao','checkin','lembrete'));
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_notifications_reserva_tipo_key
  ON public.whatsapp_notifications(reserva_id, tipo);

-- 6) Gestão de papéis: exclusiva do Admin Master
DROP POLICY IF EXISTS user_roles_select_own_or_admin ON public.user_roles;
CREATE POLICY user_roles_select_own_or_admin ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.is_admin() OR private.is_admin_master());

DROP POLICY IF EXISTS user_roles_master_insert ON public.user_roles;
CREATE POLICY user_roles_master_insert ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (private.is_admin_master());

DROP POLICY IF EXISTS user_roles_master_update ON public.user_roles;
CREATE POLICY user_roles_master_update ON public.user_roles
  FOR UPDATE TO authenticated
  USING (private.is_admin_master()) WITH CHECK (private.is_admin_master());

DROP POLICY IF EXISTS user_roles_master_delete ON public.user_roles;
CREATE POLICY user_roles_master_delete ON public.user_roles
  FOR DELETE TO authenticated USING (private.is_admin_master());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- Protege o Admin Master de perder o papel
CREATE OR REPLACE FUNCTION public.protect_admin_master()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_email text;
BEGIN
  SELECT lower(email) INTO v_email FROM auth.users WHERE id = COALESCE(OLD.user_id, NEW.user_id);
  IF v_email = 'epilif.cire@gmail.com' AND TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'O papel do Administrador Master não pode ser alterado.';
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;

DROP TRIGGER IF EXISTS trg_protect_admin_master ON public.user_roles;
CREATE TRIGGER trg_protect_admin_master
  BEFORE UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.protect_admin_master();

-- 7) Professor enxerga e avalia apenas as próprias aulas
DROP POLICY IF EXISTS reservas_select_professor ON public.reservas;
CREATE POLICY reservas_select_professor ON public.reservas
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.horarios h
    WHERE h.id = reservas.horario_id AND h.professor_user_id = auth.uid()
  ));

DROP POLICY IF EXISTS reservas_update_professor ON public.reservas;
CREATE POLICY reservas_update_professor ON public.reservas
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.horarios h
    WHERE h.id = reservas.horario_id AND h.professor_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.horarios h
    WHERE h.id = reservas.horario_id AND h.professor_user_id = auth.uid()
  ));

-- Professor vê dados básicos dos alunos inscritos nas próprias aulas
DROP POLICY IF EXISTS alunos_select_professor ON public.alunos;
CREATE POLICY alunos_select_professor ON public.alunos
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.reservas r
    JOIN public.horarios h ON h.id = r.horario_id
    WHERE r.aluno_id = alunos.id AND h.professor_user_id = auth.uid()
  ));

-- 8) Reativação de reserva limpa notificações do bot (novo ciclo)
CREATE OR REPLACE FUNCTION public.reset_whatsapp_on_reativacao()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status = 'cancelada' AND NEW.status = 'confirmada' THEN
    DELETE FROM public.whatsapp_notifications WHERE reserva_id = NEW.id;
    NEW.checkin_em := NULL;
    NEW.presenca := 'pendente';
    NEW.presenca_por := NULL;
    NEW.presenca_em := NULL;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_reset_whatsapp_on_reativacao ON public.reservas;
CREATE TRIGGER trg_reset_whatsapp_on_reativacao
  BEFORE UPDATE ON public.reservas
  FOR EACH ROW EXECUTE FUNCTION public.reset_whatsapp_on_reativacao();