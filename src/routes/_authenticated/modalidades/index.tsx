import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { fetchModalidades, qk } from "@/lib/queries";
import { EmptyState, PageTitle } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/modalidades/")({
  component: Modalidades,
  head: () => ({
    meta: [
      { title: "Modalidades — Wine Barbell Club" },
      {
        name: "description",
        content: "Conheça as modalidades do estúdio: LPO, treino híbrido e muito mais.",
      },
      { property: "og:title", content: "Modalidades — Wine Barbell Club" },
      { property: "og:description", content: "Modalidades oferecidas pelo Wine Barbell Club." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Modalidades() {
  const { data = [], isLoading } = useQuery({ queryKey: qk.modalidades, queryFn: fetchModalidades });

  return (
    <div>
      <PageTitle eyebrow="Treinos do estúdio" title="Modalidades" />
      {isLoading ? (
        <EmptyState>Carregando…</EmptyState>
      ) : data.length === 0 ? (
        <EmptyState>Nenhuma modalidade cadastrada ainda.</EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.map((m) => (
            <Link
              key={m.id}
              to="/modalidades/$id"
              params={{ id: m.id }}
              className="surface-panel group overflow-hidden transition-colors hover:border-primary/60"
            >
              {m.galeria_imagens?.[0] && (
                <img
                  src={m.galeria_imagens[0]}
                  alt={`Foto da modalidade ${m.nome}`}
                  className="h-32 w-full object-cover"
                  loading="lazy"
                />
              )}
              <div className="flex items-center gap-3 px-4 py-4">
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-2xl text-gold-gradient">{m.nome}</h2>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{m.descricao}</p>
                </div>
                <ChevronRight className="size-5 shrink-0 text-primary" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
