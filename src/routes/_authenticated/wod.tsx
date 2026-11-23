import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { fetchModalidades, fetchTreinos, qk } from "@/lib/queries";
import { formatDateLong, todayISO, youtubeEmbed } from "@/lib/format";
import { EmptyState, PageTitle } from "@/components/AppShell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/wod")({
  component: Wod,
  head: () => ({
    meta: [
      { title: "WOD do dia — Wine Barbell Club" },
      {
        name: "description",
        content: "Treino do dia por modalidade: objetivo, exercícios, séries, repetições e tempo.",
      },
      { property: "og:title", content: "WOD do dia — Wine Barbell Club" },
      { property: "og:description", content: "Confira o treino do dia do estúdio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Wod() {
  const [filtro, setFiltro] = useState<string>("todas");
  const { data: modalidades = [] } = useQuery({
    queryKey: qk.modalidades,
    queryFn: fetchModalidades,
  });
  const { data: treinos = [], isLoading } = useQuery({ queryKey: qk.treinos, queryFn: fetchTreinos });

  const hoje = todayISO();
  const lista = treinos
    .filter((t) => filtro === "todas" || t.modalidade_id === filtro)
    .filter((t) => t.data <= hoje)
    .slice(0, 20);

  return (
    <div>
      <PageTitle eyebrow="Treino" title="WOD" />

      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
        {[{ id: "todas", nome: "Todas" }, ...modalidades].map((m) => (
          <button
            key={m.id}
            onClick={() => setFiltro(m.id)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold tracking-wide uppercase transition-colors",
              filtro === m.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-muted-foreground",
            )}
          >
            {m.nome}
          </button>
        ))}
      </div>

      {isLoading ? (
        <EmptyState>Carregando treinos…</EmptyState>
      ) : lista.length === 0 ? (
        <EmptyState>Nenhum treino publicado ainda.</EmptyState>
      ) : (
        <div className="space-y-4">
          {lista.map((t) => {
            const embed = youtubeEmbed(t.video_youtube_url);
            return (
              <article key={t.id} className="surface-panel overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-5 py-3">
                  <div>
                    <p className="eyebrow">{t.modalidades?.nome}</p>
                    <h2 className="font-display text-2xl text-foreground">{t.nome}</h2>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDateLong(t.data)}</span>
                </div>
                <div className="space-y-3 px-5 py-4 text-sm">
                  {t.objetivo && (
                    <Field label="Objetivo">
                      <p>{t.objetivo}</p>
                    </Field>
                  )}
                  {t.exercicios && (
                    <Field label="Exercícios">
                      <p className="whitespace-pre-line">{t.exercicios}</p>
                    </Field>
                  )}
                  <div className="grid grid-cols-3 gap-3">
                    {t.series && <Field label="Séries">{t.series}</Field>}
                    {t.repeticoes && <Field label="Repetições">{t.repeticoes}</Field>}
                    {t.tempo && <Field label="Tempo">{t.tempo}</Field>}
                  </div>
                  {t.observacoes && (
                    <Field label="Observações">
                      <p className="whitespace-pre-line">{t.observacoes}</p>
                    </Field>
                  )}
                  {embed && (
                    <div className="aspect-video overflow-hidden rounded-lg">
                      <iframe
                        src={embed}
                        title={`Vídeo do treino ${t.nome}`}
                        className="h-full w-full"
                        allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
                        allowFullScreen
                        loading="lazy"
                      />
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <div className="mt-0.5 text-foreground">{children}</div>
    </div>
  );
}
