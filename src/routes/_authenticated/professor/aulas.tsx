import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  fetchAulasProfessor,
  fetchReservasDaAula,
  marcarPresenca,
  type Presenca,
} from "@/lib/queries";
import { formatDateLong, formatHora, tratamentoAluno } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { EmptyState, PageTitle } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/professor/aulas")({
  component: AulasProfessor,
  head: () => ({
    meta: [
      { title: "Minhas turmas — Wine Barbell Club" },
      {
        name: "description",
        content: "Área do professor: veja suas turmas e registre a presença dos alunos.",
      },
      { property: "og:title", content: "Minhas turmas — Wine Barbell Club" },
      { property: "og:description", content: "Turmas e controle de presença do professor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function AulasProfessor() {
  const { user, isProfessor, isAdmin, loading } = useAuth();
  const [aberta, setAberta] = useState<string | null>(null);

  const { data: aulas = [], isLoading } = useQuery({
    queryKey: ["aulas-professor", user?.id],
    queryFn: () => fetchAulasProfessor(user?.id),
    enabled: Boolean(user?.id),
  });

  if (loading) return <EmptyState>Verificando permissões…</EmptyState>;
  if (!isProfessor && !isAdmin)
    return <EmptyState>Esta área é exclusiva de professores.</EmptyState>;

  return (
    <>
      <PageTitle eyebrow="Professor" title="Minhas turmas" />
      {isLoading ? (
        <EmptyState>Carregando turmas…</EmptyState>
      ) : aulas.length === 0 ? (
        <EmptyState>Você ainda não é responsável por nenhuma aula.</EmptyState>
      ) : (
        <div className="space-y-3">
          {aulas.map((a: any) => (
            <div key={a.id} className="surface-panel px-4 py-4">
              <button
                className="flex w-full items-center justify-between gap-3 text-left"
                onClick={() => setAberta(aberta === a.id ? null : a.id)}
              >
                <div>
                  <p className="eyebrow">{a.modalidades?.nome ?? "Aula"}</p>
                  <h2 className="font-display text-xl text-foreground">
                    {formatDateLong(a.data)} · {formatHora(a.horario)}
                  </h2>
                </div>
                <span className="text-xs text-muted-foreground">
                  {aberta === a.id ? "Fechar" : "Ver turma"}
                </span>
              </button>
              {aberta === a.id && <Turma horarioId={a.id} />}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function Turma({ horarioId }: { horarioId: string }) {
  const qc = useQueryClient();
  const { data: reservas = [], isLoading } = useQuery({
    queryKey: ["turma", horarioId],
    queryFn: () => fetchReservasDaAula(horarioId),
  });

  const presenca = useMutation({
    mutationFn: ({ id, valor }: { id: string; valor: Presenca }) => marcarPresenca(id, valor),
    onSuccess: () => {
      toast.success("Presença atualizada.");
      qc.invalidateQueries({ queryKey: ["turma", horarioId] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível atualizar."),
  });

  const ativas = (reservas as any[]).filter((r) => r.status === "confirmada");

  if (isLoading) return <p className="mt-3 text-sm text-muted-foreground">Carregando turma…</p>;
  if (ativas.length === 0)
    return <p className="mt-3 text-sm text-muted-foreground">Nenhuma reserva confirmada.</p>;

  return (
    <ul className="mt-4 space-y-2 border-t border-border pt-4">
      {ativas.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{r.alunos?.nome}</p>
            <p className="text-xs text-muted-foreground">
              {tratamentoAluno(r.alunos?.genero)} ·{" "}
              {r.checkin_em ? "check-in feito" : "sem check-in"} · {r.presenca}
            </p>
          </div>
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant={r.presenca === "presente" ? "default" : "secondary"}
              onClick={() => presenca.mutate({ id: r.id, valor: "presente" })}
            >
              Presente
            </Button>
            <Button
              size="sm"
              variant={r.presenca === "falta" ? "destructive" : "secondary"}
              onClick={() => presenca.mutate({ id: r.id, valor: "falta" })}
            >
              Falta
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
