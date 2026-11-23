import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchNotificacoes, qk } from "@/lib/queries";
import { EmptyState, PageTitle } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/notificacoes")({
  component: Notificacoes,
  head: () => ({
    meta: [
      { title: "Notificações — Wine Barbell Club" },
      { name: "description", content: "Comunicados, avisos de aulas e novidades do estúdio." },
      { property: "og:title", content: "Notificações — Wine Barbell Club" },
      { property: "og:description", content: "Comunicados e avisos do estúdio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Notificacoes() {
  const { data = [], isLoading } = useQuery({
    queryKey: qk.notificacoes,
    queryFn: fetchNotificacoes,
  });

  return (
    <div>
      <PageTitle eyebrow="Comunicados" title="Notificações" />
      {isLoading ? (
        <EmptyState>Carregando…</EmptyState>
      ) : data.length === 0 ? (
        <EmptyState>Nenhuma notificação recebida.</EmptyState>
      ) : (
        <div className="space-y-2">
          {(data as any[]).map((n) => (
            <article key={n.id} className="surface-panel px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-sm font-semibold text-foreground">{n.titulo}</h2>
                <span className="shrink-0 text-[10px] tracking-wide text-muted-foreground uppercase">
                  {new Date(n.data_envio).toLocaleDateString("pt-BR")}
                </span>
              </div>
              <p className="mt-1 text-xs whitespace-pre-line text-muted-foreground">{n.mensagem}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
