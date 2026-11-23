import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronDown, Users } from "lucide-react";
import { fetchHorarios, fetchReservasDetalhadas, qk } from "@/lib/queries";
import { formatDateLong, formatHora, tratamentoAluno } from "@/lib/format";
import { AdminGuard } from "@/components/AdminGuard";
import { EmptyState, PageTitle } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/agenda")({
  component: () => (
    <AdminGuard>
      <AdminAgenda />
    </AdminGuard>
  ),
  head: () => ({
    meta: [
      { title: "Agenda do administrador — Wine Barbell Club" },
      {
        name: "description",
        content: "Todas as aulas cadastradas com a lista de alunos reservados em cada turma.",
      },
      { property: "og:title", content: "Agenda do administrador — Wine Barbell Club" },
      { property: "og:description", content: "Aulas cadastradas e alunos reservados." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function AdminAgenda() {
  const [futuras, setFuturas] = useState(true);
  const [aberta, setAberta] = useState<string | null>(null);

  const { data: horarios = [], isLoading } = useQuery({
    queryKey: [...qk.horarios, futuras],
    queryFn: () => fetchHorarios(futuras),
  });
  const { data: reservas = [] } = useQuery({
    queryKey: ["reservas-detalhadas"],
    queryFn: fetchReservasDetalhadas,
  });

  const porHorario = new Map<string, any[]>();
  for (const r of reservas) {
    const lista = porHorario.get(r.horario_id) ?? [];
    lista.push(r);
    porHorario.set(r.horario_id, lista);
  }

  return (
    <div>
      <PageTitle
        eyebrow="Administração"
        title="Agenda"
        action={
          <Button size="sm" variant="outline" onClick={() => setFuturas((f) => !f)}>
            {futuras ? "Ver todas" : "Só próximas"}
          </Button>
        }
      />

      {isLoading ? (
        <EmptyState>Carregando…</EmptyState>
      ) : horarios.length === 0 ? (
        <EmptyState>Nenhuma aula cadastrada.</EmptyState>
      ) : (
        <div className="space-y-2">
          {horarios.map((h) => {
            const alunos = porHorario.get(h.id) ?? [];
            const open = aberta === h.id;
            return (
              <article key={h.id} className="surface-panel overflow-hidden">
                <button
                  onClick={() => setAberta(open ? null : h.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  aria-expanded={open}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-lg text-foreground">
                      {h.modalidades?.nome ?? "Aula"}
                      {h.cancelada && (
                        <span className="ml-2 text-xs text-destructive">cancelada</span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDateLong(h.data)} · {formatHora(h.horario)} · {h.instrutor}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "flex items-center gap-1 text-xs font-semibold",
                      alunos.length >= h.limite_vagas ? "text-destructive" : "text-primary",
                    )}
                  >
                    <Users className="size-3.5" />
                    {alunos.length}/{h.limite_vagas}
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-muted-foreground transition-transform",
                      open && "rotate-180",
                    )}
                  />
                </button>

                {open && (
                  <div className="border-t border-border px-4 py-3">
                    <p className="eyebrow mb-2">Alunos reservados</p>
                    {alunos.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Nenhum aluno reservou esta aula.
                      </p>
                    ) : (
                      <ul className="space-y-1.5 text-sm">
                        {alunos.map((r) => (
                          <li key={r.id} className="flex items-center justify-between gap-3">
                            <span className="truncate text-foreground">
                              {r.alunos?.nome ?? tratamentoAluno((r.alunos as any)?.genero)}
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {r.alunos?.telefone ?? r.alunos?.email ?? "—"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {h.observacoes && (
                      <p className="mt-3 text-xs text-muted-foreground">{h.observacoes}</p>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
