import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { diasAtrasISO, fetchAssiduidade } from "@/lib/queries";
import { formatHora } from "@/lib/format";
import { AdminGuard } from "@/components/AdminGuard";
import { EmptyState, PageTitle } from "@/components/AppShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/assiduidade")({
  component: () => (
    <AdminGuard>
      <AdminAssiduidade />
    </AdminGuard>
  ),
  head: () => ({
    meta: [
      { title: "Assiduidade — Wine Barbell Club" },
      {
        name: "description",
        content: "Frequência média, faltas, turmas e horários mais procurados do estúdio.",
      },
      { property: "og:title", content: "Assiduidade — Wine Barbell Club" },
      { property: "og:description", content: "Indicadores de presença e ocupação das turmas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const PERIODOS = [
  { dias: 30, label: "30 dias" },
  { dias: 90, label: "3 meses" },
  { dias: 365, label: "1 ano" },
] as const;

function AdminAssiduidade() {
  const [dias, setDias] = useState<number>(30);
  const desde = diasAtrasISO(dias);

  const { data: reservas = [], isLoading } = useQuery({
    queryKey: ["assiduidade", dias],
    queryFn: () => fetchAssiduidade(desde),
  });

  const confirmadas = reservas.filter((r) => r.status === "confirmada" && !r.horarios?.cancelada);
  const presentes = confirmadas.filter((r) => r.presenca === "presente").length;
  const faltas = confirmadas.filter((r) => r.presenca === "falta").length;
  const avaliadas = presentes + faltas;
  const frequencia = avaliadas > 0 ? Math.round((presentes / avaliadas) * 100) : 0;
  const canceladas = reservas.filter((r) => r.status === "cancelada").length;

  const porModalidade = new Map<string, number>();
  const porHora = new Map<string, number>();
  const porAula = new Map<string, { usados: number; limite: number }>();
  for (const r of confirmadas) {
    const h = r.horarios;
    if (!h) continue;
    const mod = h.modalidades?.nome ?? "Aula";
    porModalidade.set(mod, (porModalidade.get(mod) ?? 0) + 1);
    const hora = String(h.horario).slice(0, 5);
    porHora.set(hora, (porHora.get(hora) ?? 0) + 1);
    const atual = porAula.get(r.horario_id) ?? { usados: 0, limite: h.limite_vagas || 0 };
    atual.usados += 1;
    porAula.set(r.horario_id, atual);
  }

  const ocupacoes = [...porAula.values()].filter((a) => a.limite > 0);
  const ocupacaoMedia =
    ocupacoes.length > 0
      ? Math.round(
          (ocupacoes.reduce((acc, a) => acc + a.usados / a.limite, 0) / ocupacoes.length) * 100,
        )
      : 0;

  const top = (m: Map<string, number>) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="space-y-6">
      <PageTitle
        eyebrow="Administração"
        title="Assiduidade"
        action={
          <div className="flex gap-1">
            {PERIODOS.map((p) => (
              <Button
                key={p.dias}
                size="sm"
                variant={dias === p.dias ? "default" : "outline"}
                onClick={() => setDias(p.dias)}
              >
                {p.label}
              </Button>
            ))}
          </div>
        }
      />

      {isLoading ? (
        <EmptyState>Carregando…</EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Frequência média" valor={`${frequencia}%`} />
            <Stat label="Faltas" valor={faltas} />
            <Stat label="Presenças" valor={presentes} />
            <Stat label="Ocupação média" valor={`${ocupacaoMedia}%`} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Stat label="Reservas confirmadas" valor={confirmadas.length} />
            <Stat label="Reservas canceladas" valor={canceladas} />
          </div>

          <Lista titulo="Turmas mais procuradas" itens={top(porModalidade)} />
          <Lista
            titulo="Horários mais procurados"
            itens={top(porHora).map(([h, n]) => [formatHora(h), n] as [string, number])}
          />
        </>
      )}
    </div>
  );
}

function Lista({ titulo, itens }: { titulo: string; itens: [string, number][] }) {
  return (
    <section>
      <p className="eyebrow mb-2">{titulo}</p>
      {itens.length === 0 ? (
        <EmptyState>Sem dados no período.</EmptyState>
      ) : (
        <ul className="surface-panel divide-y divide-border">
          {itens.map(([nome, qtd]) => (
            <li key={nome} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="truncate text-foreground">{nome}</span>
              <span className="shrink-0 text-xs font-semibold text-primary">{qtd} reservas</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Stat({ label, valor }: { label: string; valor: number | string }) {
  return (
    <div className="surface-panel px-3 py-4 text-center">
      <p className="font-display text-3xl text-gold-gradient">{valor}</p>
      <p className="mt-1 text-[10px] tracking-wide text-muted-foreground uppercase">{label}</p>
    </div>
  );
}
