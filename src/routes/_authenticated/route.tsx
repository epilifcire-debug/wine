import { useEffect } from "react";
import { createFileRoute, Outlet, redirect, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, EmptyState } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { fetchContratos, qk, statusContrato } from "@/lib/queries";

/** Telas liberadas antes de aderir a um plano. Todo o resto exige plano ativo. */
const ROTAS_SEM_PLANO = ["/planos", "/perfil", "/notificacoes"];

/**
 * Trava de adesão: aluno sem plano ativo só acessa a tela de planos.
 * O plano é liberado após o pagamento confirmado pela administração.
 * A regra de reserva também é aplicada no banco (check_limite_semanal).
 */
function PlanoGate({ children }: { children: React.ReactNode }) {
  const { aluno, isAdmin, loading } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const { data: contratos, isLoading } = useQuery({
    queryKey: qk.contratos(aluno?.id),
    queryFn: () => fetchContratos(aluno?.id),
    enabled: Boolean(aluno?.id) && !isAdmin,
  });

  const verificando = loading || (!isAdmin && Boolean(aluno?.id) && (isLoading || contratos === undefined));
  const liberado = (contratos ?? []).some((c) => {
    const s = statusContrato(c);
    return s === "ativo" || s === "proximo_vencimento";
  });
  const naRotaLivre = ROTAS_SEM_PLANO.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const bloqueado = !verificando && !isAdmin && Boolean(aluno?.id) && !liberado && !naRotaLivre;

  useEffect(() => {
    if (bloqueado) navigate({ to: "/planos", replace: true });
  }, [bloqueado, navigate]);

  if (verificando) return <EmptyState>Carregando…</EmptyState>;
  if (bloqueado) return <EmptyState>Escolha um plano para liberar as aulas.</EmptyState>;
  return <>{children}</>;
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: () => (
    <AppShell>
      <PlanoGate>
        <Outlet />
      </PlanoGate>
    </AppShell>
  ),
});
