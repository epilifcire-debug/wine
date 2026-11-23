import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Perfil = {
  id: string;
  nome: string;
  telefone: string | null;
  foto_url: string | null;
};

export type AlunoRow = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  foto_url: string | null;
  genero: string | null;
  nascimento_mascarado: string | null;
  plano_id: string | null;
  endereco?: string | null;
  contato_emergencia?: string | null;
  observacoes?: string | null;
};

type AuthState = {
  session: Session | null;
  user: User | null;
  perfil: Perfil | null;
  aluno: AlunoRow | null;
  isAdmin: boolean;
  isAdminMaster: boolean;
  isProfessor: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const ADMIN_MASTER_EMAIL = "epilif.cire@gmail.com";

const AuthContext = createContext<AuthState>({
  session: null,
  user: null,
  perfil: null,
  aluno: null,
  isAdmin: false,
  isAdminMaster: false,
  isProfessor: false,
  loading: true,
  refresh: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [aluno, setAluno] = useState<AlunoRow | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isProfessor, setIsProfessor] = useState(false);
  const [loading, setLoading] = useState(true);


  async function loadExtras(userId: string | undefined) {
    if (!userId) {
      setPerfil(null);
      setAluno(null);
      setIsAdmin(false);
      setIsProfessor(false);
      return;
    }
    const [{ data: p }, { data: roles }, { data: a }] = await Promise.all([
      supabase.from("profiles").select("id,nome,telefone,foto_url").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase
        .from("alunos")
        .select("id,nome,telefone,email,genero,foto_url,nascimento_mascarado,plano_id,endereco,contato_emergencia,observacoes")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);
    setPerfil((p as Perfil) ?? null);
    const admin = Boolean(roles?.some((r) => String(r.role) === "admin"));
    setIsAdmin(admin);
    setIsProfessor(Boolean(roles?.some((r) => String(r.role) === "professor")));

    let ficha = (a as AlunoRow) ?? null;
    // Autocorreção: conta sem ficha de aluno (falha no cadastro ou conta antiga).
    if (!ficha && !admin) {
      const { error } = await supabase.rpc("ensure_current_student");
      if (!error) {
        const { data: novo } = await supabase
          .from("alunos")
          .select("id,nome,telefone,email,genero,foto_url,nascimento_mascarado,plano_id,endereco,contato_emergencia,observacoes")
          .eq("user_id", userId)
          .maybeSingle();
        ficha = (novo as AlunoRow) ?? null;
      }
    }
    setAluno(ficha);
  }



  useEffect(() => {
    let active = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!active) return;
      setSession(s);
      if (!s) {
        setPerfil(null);
        setAluno(null);
        setIsAdmin(false);
        setIsProfessor(false);
      }
    });

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadExtras(data.session?.user.id);
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    loadExtras(session.user.id);
  }, [session?.user?.id]);

  const isAdminMaster =
    (session?.user?.email ?? "").toLowerCase() === ADMIN_MASTER_EMAIL;

  const value: AuthState = {
    session,
    user: session?.user ?? null,
    perfil,
    aluno,
    isAdmin: isAdmin || isAdminMaster,
    isAdminMaster,
    isProfessor,
    loading,

    refresh: async () => loadExtras(session?.user.id),
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
