import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { youtubeEmbed } from "@/lib/format";
import { EmptyState } from "@/components/AppShell";
import type { Modalidade } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/modalidades/$id")({
  component: DetalheModalidade,
  head: () => ({
    meta: [
      { title: "Modalidade — Wine Barbell Club" },
      {
        name: "description",
        content: "O que é, como funciona a aula, exercícios e benefícios desta modalidade.",
      },
      { property: "og:title", content: "Modalidade — Wine Barbell Club" },
      { property: "og:description", content: "Detalhes completos da modalidade." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function DetalheModalidade() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["modalidades", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modalidades")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as Modalidade | null;
    },
  });

  if (isLoading) return <EmptyState>Carregando…</EmptyState>;
  if (!data) return <EmptyState>Modalidade não encontrada.</EmptyState>;

  const embed = youtubeEmbed(data.video_youtube_url);

  return (
    <article className="space-y-5">
      <Link
        to="/modalidades"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
      >
        <ArrowLeft className="size-4" /> Modalidades
      </Link>

      <header>
        <p className="eyebrow">Modalidade</p>
        <h1 className="font-display text-4xl text-gold-gradient">{data.nome}</h1>
        {data.descricao && <p className="mt-1 text-sm text-muted-foreground">{data.descricao}</p>}
      </header>

      {embed && (
        <div className="aspect-video overflow-hidden rounded-xl border border-border">
          <iframe
            src={embed}
            title={`Vídeo sobre ${data.nome}`}
            className="h-full w-full"
            allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
      )}

      <Bloco titulo="O que é" texto={data.o_que_e} />
      <Bloco titulo="Como funciona uma aula" texto={data.como_funciona} />
      <Bloco titulo="Exercícios e movimentos" texto={data.exercicios} />
      <Bloco titulo="Benefícios" texto={data.beneficios} />

      {data.galeria_imagens?.length > 0 && (
        <section>
          <p className="eyebrow mb-2">Galeria</p>
          <div className="grid grid-cols-2 gap-2">
            {data.galeria_imagens.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`${data.nome} — foto ${i + 1}`}
                className="h-32 w-full rounded-lg object-cover"
                loading="lazy"
              />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

function Bloco({ titulo, texto }: { titulo: string; texto: string | null }) {
  if (!texto) return null;
  return (
    <section className="surface-panel px-5 py-4">
      <p className="eyebrow">{titulo}</p>
      <p className="mt-1 text-sm whitespace-pre-line text-foreground">{texto}</p>
    </section>
  );
}
