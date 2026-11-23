import { type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { EmptyState } from "@/components/AppShell";

export function AdminGuard({ children }: { children: ReactNode }) {
  const { isAdmin, loading } = useAuth();
  if (loading) return <EmptyState>Verificando permissões…</EmptyState>;
  if (!isAdmin)
    return (
      <EmptyState>
        Esta área é exclusiva da administração.{" "}
        <Link to="/app" className="font-semibold text-primary">
          Voltar ao início
        </Link>
      </EmptyState>
    );
  return <>{children}</>;
}
