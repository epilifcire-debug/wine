-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin', 'aluno');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL DEFAULT '',
  telefone text,
  foto_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

CREATE POLICY "profiles_select_own_or_admin" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "profiles_update_own_or_admin" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin()) WITH CHECK (id = auth.uid() OR public.is_admin());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR public.is_admin());

CREATE POLICY "user_roles_select_own_or_admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ALUNOS
CREATE TABLE public.alunos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  nome text NOT NULL,
  telefone text,
  email text,
  endereco text,
  contato_emergencia text,
  observacoes text,
  foto_url text,
  ativo boolean NOT NULL DEFAULT true,
  cpf_mascarado text,
  nascimento_mascarado text,
  -- extensibilidade futura
  plano_id uuid,
  whatsapp_optin boolean NOT NULL DEFAULT false,
  google_calendar_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alunos TO authenticated;
GRANT ALL ON public.alunos TO service_role;
ALTER TABLE public.alunos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alunos_select_own_or_admin" ON public.alunos FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "alunos_update_own_or_admin" ON public.alunos FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin()) WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "alunos_insert_admin_or_self" ON public.alunos FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR user_id = auth.uid());
CREATE POLICY "alunos_delete_admin" ON public.alunos FOR DELETE TO authenticated
  USING (public.is_admin());
CREATE TRIGGER trg_alunos_updated BEFORE UPDATE ON public.alunos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- DADOS SENSIVEIS (somente admin)
CREATE TABLE public.alunos_sensiveis (
  aluno_id uuid PRIMARY KEY REFERENCES public.alunos(id) ON DELETE CASCADE,
  cpf text,
  data_nascimento date,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alunos_sensiveis TO authenticated;
GRANT ALL ON public.alunos_sensiveis TO service_role;
ALTER TABLE public.alunos_sensiveis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sensiveis_admin_only" ON public.alunos_sensiveis FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_sensiveis_updated BEFORE UPDATE ON public.alunos_sensiveis
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- mantem versoes mascaradas na tabela publica
CREATE OR REPLACE FUNCTION public.sync_mascarados()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.alunos SET
    cpf_mascarado = CASE WHEN NEW.cpf IS NULL OR NEW.cpf = '' THEN NULL ELSE '***.000.000-**' END,
    nascimento_mascarado = CASE WHEN NEW.data_nascimento IS NULL THEN NULL ELSE '00/00/*****' END
  WHERE id = NEW.aluno_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_sync_mascarados AFTER INSERT OR UPDATE ON public.alunos_sensiveis
  FOR EACH ROW EXECUTE FUNCTION public.sync_mascarados();

-- MODALIDADES
CREATE TABLE public.modalidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  o_que_e text,
  como_funciona text,
  beneficios text,
  exercicios text,
  video_youtube_url text,
  galeria_imagens text[] NOT NULL DEFAULT '{}',
  cor text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.modalidades TO authenticated;
GRANT ALL ON public.modalidades TO service_role;
ALTER TABLE public.modalidades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modalidades_select_auth" ON public.modalidades FOR SELECT TO authenticated USING (true);
CREATE POLICY "modalidades_write_admin" ON public.modalidades FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_modalidades_updated BEFORE UPDATE ON public.modalidades
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- HORARIOS
CREATE TABLE public.horarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modalidade_id uuid NOT NULL REFERENCES public.modalidades(id) ON DELETE CASCADE,
  instrutor text NOT NULL,
  data date NOT NULL,
  horario time NOT NULL,
  limite_vagas integer NOT NULL DEFAULT 10 CHECK (limite_vagas > 0),
  observacoes text,
  cancelada boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.horarios TO authenticated;
GRANT ALL ON public.horarios TO service_role;
ALTER TABLE public.horarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "horarios_select_auth" ON public.horarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "horarios_write_admin" ON public.horarios FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_horarios_updated BEFORE UPDATE ON public.horarios
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RESERVAS
CREATE TYPE public.reserva_status AS ENUM ('confirmada', 'cancelada');
CREATE TABLE public.reservas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  horario_id uuid NOT NULL REFERENCES public.horarios(id) ON DELETE CASCADE,
  status public.reserva_status NOT NULL DEFAULT 'confirmada',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (aluno_id, horario_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservas TO authenticated;
GRANT ALL ON public.reservas TO service_role;
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reservas_select_own_or_admin" ON public.reservas FOR SELECT TO authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = reservas.aluno_id AND a.user_id = auth.uid()));
CREATE POLICY "reservas_insert_own_or_admin" ON public.reservas FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = reservas.aluno_id AND a.user_id = auth.uid()));
CREATE POLICY "reservas_update_own_or_admin" ON public.reservas FOR UPDATE TO authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = reservas.aluno_id AND a.user_id = auth.uid()))
  WITH CHECK (public.is_admin() OR EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = reservas.aluno_id AND a.user_id = auth.uid()));
CREATE POLICY "reservas_delete_own_or_admin" ON public.reservas FOR DELETE TO authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = reservas.aluno_id AND a.user_id = auth.uid()));
CREATE TRIGGER trg_reservas_updated BEFORE UPDATE ON public.reservas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- bloqueia reserva sem vaga (sem lista de espera)
CREATE OR REPLACE FUNCTION public.check_vagas()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_limite integer; v_ocupadas integer;
BEGIN
  IF NEW.status <> 'confirmada' THEN RETURN NEW; END IF;
  SELECT limite_vagas INTO v_limite FROM public.horarios WHERE id = NEW.horario_id;
  SELECT count(*) INTO v_ocupadas FROM public.reservas
    WHERE horario_id = NEW.horario_id AND status = 'confirmada' AND id <> COALESCE(NEW.id, gen_random_uuid());
  IF v_ocupadas >= v_limite THEN
    RAISE EXCEPTION 'Turma lotada: não há vagas disponíveis para este horário.';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_check_vagas BEFORE INSERT OR UPDATE ON public.reservas
  FOR EACH ROW EXECUTE FUNCTION public.check_vagas();

-- contagem publica de vagas (para alunos verem lotação)
CREATE OR REPLACE FUNCTION public.vagas_ocupadas(_horario_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM public.reservas WHERE horario_id = _horario_id AND status = 'confirmada'
$$;

-- TREINOS (WOD)
CREATE TABLE public.treinos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modalidade_id uuid NOT NULL REFERENCES public.modalidades(id) ON DELETE CASCADE,
  nome text NOT NULL,
  data date NOT NULL DEFAULT current_date,
  objetivo text,
  exercicios text,
  series text,
  repeticoes text,
  tempo text,
  observacoes text,
  video_youtube_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treinos TO authenticated;
GRANT ALL ON public.treinos TO service_role;
ALTER TABLE public.treinos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "treinos_select_auth" ON public.treinos FOR SELECT TO authenticated USING (true);
CREATE POLICY "treinos_write_admin" ON public.treinos FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_treinos_updated BEFORE UPDATE ON public.treinos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- BIBLIOTECA TECNICA
CREATE TABLE public.exercicios_biblioteca (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  categoria text,
  explicacao text,
  dicas text,
  erros_comuns text,
  video_youtube_url text,
  imagem_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercicios_biblioteca TO authenticated;
GRANT ALL ON public.exercicios_biblioteca TO service_role;
ALTER TABLE public.exercicios_biblioteca ENABLE ROW LEVEL SECURITY;
CREATE POLICY "biblioteca_select_auth" ON public.exercicios_biblioteca FOR SELECT TO authenticated USING (true);
CREATE POLICY "biblioteca_write_admin" ON public.exercicios_biblioteca FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_biblioteca_updated BEFORE UPDATE ON public.exercicios_biblioteca
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- CHECKIN CODIGOS
CREATE TABLE public.checkin_codigos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  horario_id uuid REFERENCES public.horarios(id) ON DELETE CASCADE,
  valido_ate timestamptz NOT NULL DEFAULT (now() + interval '3 hours'),
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkin_codigos TO authenticated;
GRANT ALL ON public.checkin_codigos TO service_role;
ALTER TABLE public.checkin_codigos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "codigos_admin_all" ON public.checkin_codigos FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- PRESENCAS
CREATE TABLE public.presencas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  horario_id uuid REFERENCES public.horarios(id) ON DELETE SET NULL,
  codigo_id uuid REFERENCES public.checkin_codigos(id) ON DELETE SET NULL,
  data_checkin timestamptz NOT NULL DEFAULT now(),
  UNIQUE (aluno_id, horario_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.presencas TO authenticated;
GRANT ALL ON public.presencas TO service_role;
ALTER TABLE public.presencas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "presencas_select_own_or_admin" ON public.presencas FOR SELECT TO authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = presencas.aluno_id AND a.user_id = auth.uid()));
CREATE POLICY "presencas_write_admin" ON public.presencas FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- funcao de check-in por codigo digitado
CREATE OR REPLACE FUNCTION public.fazer_checkin(_codigo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cod public.checkin_codigos%ROWTYPE; v_aluno uuid;
BEGIN
  SELECT id INTO v_aluno FROM public.alunos WHERE user_id = auth.uid();
  IF v_aluno IS NULL THEN RETURN jsonb_build_object('ok', false, 'message', 'Ficha de aluno não encontrada.'); END IF;
  SELECT * INTO v_cod FROM public.checkin_codigos WHERE upper(codigo) = upper(trim(_codigo));
  IF v_cod.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'message', 'Código inválido.'); END IF;
  IF NOT v_cod.ativo OR v_cod.valido_ate < now() THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Código expirado.');
  END IF;
  IF EXISTS (SELECT 1 FROM public.presencas WHERE aluno_id = v_aluno AND horario_id IS NOT DISTINCT FROM v_cod.horario_id) THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Check-in já realizado.');
  END IF;
  INSERT INTO public.presencas (aluno_id, horario_id, codigo_id) VALUES (v_aluno, v_cod.horario_id, v_cod.id);
  RETURN jsonb_build_object('ok', true, 'message', 'Check-in confirmado!');
END; $$;
GRANT EXECUTE ON FUNCTION public.fazer_checkin(text) TO authenticated;

-- NOTIFICACOES
CREATE TABLE public.notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  mensagem text NOT NULL,
  tipo text NOT NULL DEFAULT 'comunicado',
  data_envio timestamptz NOT NULL DEFAULT now(),
  enviado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notificacoes TO authenticated;
GRANT ALL ON public.notificacoes TO service_role;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notificacoes_select_auth" ON public.notificacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "notificacoes_write_admin" ON public.notificacoes FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.notificacoes_leitura (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notificacao_id uuid NOT NULL REFERENCES public.notificacoes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lida_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (notificacao_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notificacoes_leitura TO authenticated;
GRANT ALL ON public.notificacoes_leitura TO service_role;
ALTER TABLE public.notificacoes_leitura ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leitura_own" ON public.notificacoes_leitura FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- signup: cria profile, ficha de aluno e papel
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_nome text; v_role public.app_role; v_aluno uuid;
BEGIN
  v_nome := COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  INSERT INTO public.profiles (id, nome, foto_url)
    VALUES (NEW.id, v_nome, NEW.raw_user_meta_data->>'avatar_url');

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    v_role := 'admin';
  ELSE
    v_role := 'aluno';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);

  IF v_role = 'aluno' THEN
    INSERT INTO public.alunos (user_id, nome, email) VALUES (NEW.id, v_nome, NEW.email)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- dados iniciais de exemplo
INSERT INTO public.modalidades (nome, descricao, o_que_e, como_funciona, beneficios, exercicios, video_youtube_url) VALUES
('LPO', 'Levantamento de Peso Olímpico', 'O LPO é o esporte olímpico composto por dois movimentos: Arranco (Snatch) e Arremesso (Clean & Jerk).', 'A aula começa com mobilidade e aquecimento específico, segue para trabalho técnico com barra vazia, progressões e termina com trabalho de força acessória.', 'Potência explosiva, coordenação, mobilidade articular, força total do corpo e consciência corporal.', 'Snatch, Clean & Jerk, Power Clean, Front Squat, Overhead Squat, Puxadas altas', 'https://www.youtube.com/watch?v=dGpuNu2rSVQ'),
('Híbrido', 'Treino híbrido de força e condicionamento', 'Metodologia que combina força, resistência e condicionamento metabólico em uma única sessão.', 'Aquecimento geral, bloco de força principal, seguido de um WOD condicionante e alongamento final.', 'Perda de gordura, ganho de força, resistência cardiovascular e performance geral.', 'Agachamento, Levantamento Terra, Remada, Kettlebell Swing, Corrida, Burpee', 'https://www.youtube.com/watch?v=UBMk30rjy0o');