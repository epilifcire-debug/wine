import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { fetchEventos, qk, signedAvatar, type Evento } from "@/lib/queries";
import { formatDateBR, formatHora, todayISO } from "@/lib/format";
import { EmptyState, PageTitle } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/eventos")({
  component: Eventos,
  head: () => ({
    meta: [
      { title: "Eventos — Wine Barbell Club" },
      {
        name: "description",
        content: "Confira os próximos eventos, competições e encontros do Wine Barbell Club.",
      },
      { property: "og:title", content: "Eventos — Wine Barbell Club" },
      { property: "og:description", content: "Agenda de eventos do estúdio Wine Barbell Club." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

export function EventoImagem({ path, alt }: { path?: string | null; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    signedAvatar(path).then((u) => ativo && setUrl(u));
    return () => {
      ativo = false;
    };
  }, [path]);

  if (!url) return null;
  return <img src={url} alt={alt} loading="lazy" className="h-40 w-full object-cover" />;
}

function EventoCard({ evento, passado }: { evento: Evento; passado?: boolean }) {
  return (
    <article
      className={`surface-panel overflow-hidden ${passado ? "opacity-70" : ""}`}
    >
      <EventoImagem path={evento.imagem_url} alt={`Imagem do evento ${evento.titulo}`} />
      <div className="space-y-2 px-4 py-4">
        <h3 className="font-display text-2xl leading-none text-gold-gradient">{evento.titulo}</h3>
        {evento.descricao && (
          <p className="text-sm text-muted-foreground">{evento.descricao}</p>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CalendarDays className="size-3.5 text-primary" /> {formatDateBR(evento.data)}
          </span>
          {evento.horario && (
            <span className="flex items-center gap-1">
              <Clock className="size-3.5 text-primary" /> {formatHora(evento.horario)}
            </span>
          )}
          {evento.local && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5 text-primary" /> {evento.local}
            </span>
          )}
        </div>
        {evento.informacoes && (
          <p className="border-t border-border pt-2 text-xs whitespace-pre-line text-muted-foreground">
            {evento.informacoes}
          </p>
        )}
      </div>
    </article>
  );
}

function Eventos() {
  const { data = [], isLoading } = useQuery({ queryKey: qk.eventos, queryFn: fetchEventos });
  const hoje = todayISO();
  const publicados = data.filter((e) => e.publicado);
  const proximos = publicados
    .filter((e) => e.data >= hoje)
    .sort((a, b) => a.data.localeCompare(b.data));
  const anteriores = publicados.filter((e) => e.data < hoje);

  return (
    <div>
      <PageTitle eyebrow="Comunidade" title="Eventos" />

      {isLoading ? (
        <EmptyState>Carregando…</EmptyState>
      ) : publicados.length === 0 ? (
        <EmptyState>Nenhum evento publicado no momento.</EmptyState>
      ) : (
        <div className="space-y-6">
          <section className="space-y-3">
            <p className="eyebrow">Próximos</p>
            {proximos.length === 0 ? (
              <EmptyState>Nenhum evento programado.</EmptyState>
            ) : (
              proximos.map((e) => <EventoCard key={e.id} evento={e} />)
            )}
          </section>

          {anteriores.length > 0 && (
            <section className="space-y-3">
              <p className="eyebrow">Anteriores</p>
              {anteriores.map((e) => (
                <EventoCard key={e.id} evento={e} passado />
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
