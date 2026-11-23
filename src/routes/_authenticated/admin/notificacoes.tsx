import { createFileRoute } from "@tanstack/react-router";
import { AdminGuard } from "@/components/AdminGuard";
import { PageTitle } from "@/components/AppShell";

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
  return (
    <div className="space-y-4">
      <PageTitle eyebrow="Administração" title="Notificações" />
      <p className="text-muted-foreground">Envio de comunicados em breve.</p>
    </div>
  );
}
