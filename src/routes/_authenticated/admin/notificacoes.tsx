import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminGuard } from "@/components/AdminGuard";
import { PageTitle, EmptyState } from "@/components/AppShell";
import { fetchNotificacoes, qk } from "@/lib/queries";
import { formatDateBR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/notificacoes")({
  component: () => (
    <AdminGuard>
      <NotificacoesAdmin />
    </AdminGuard>
  ),
  head: () => ({
    meta: [
      { title: "Notificações administrativas — Wine Barbell Club" },
      { name: "description", content: "Área administrativa de comunicados do Wine Barbell Club." },
      { property: "og:title", content: "Notificações administrativas — Wine Barbell Club" },
      { property: "og:description", content: "Área administrativa de comunicados do estúdio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function NotificacoesAdmin() {
  const { data: notificacoes = [], isLoading } = useQuery({
    queryKey: qk.notificacoes,
    queryFn: fetchNotificacoes,
    refetchInterval: 15000,
  });

  return (
    <div className="space-y-4">
      <PageTitle eyebrow="Administração" title="Notificações" />
      {isLoading ? (
        <EmptyState>Carregando notificações…</EmptyState>
      ) : notificacoes.length === 0 ? (
        <EmptyState>Nenhuma notificação ainda.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {notificacoes.map((n) => (
            <li key={n.id} className="surface-panel px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium text-foreground">{n.titulo}</p>
                <span className="shrink-0 text-xs text-muted-foreground">{formatDateBR(n.data_envio)}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{n.mensagem}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
