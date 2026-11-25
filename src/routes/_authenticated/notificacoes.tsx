import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { EmptyState } from "@/components/AppShell";

// Notificações são só da administração: admin vai para a página dele,
// aluno e professor voltam ao início.
export const Route = createFileRoute("/_authenticated/notificacoes")({
  component: Notificacoes,
});

function Notificacoes() {
  const { isAdmin, loading } = useAuth();
  if (loading) return <EmptyState>Carregando…</EmptyState>;
  return <Navigate to={isAdmin ? "/admin/notificacoes" : "/app"} replace />;
}
