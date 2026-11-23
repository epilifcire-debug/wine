import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  Bell,
  CalendarClock,
  CalendarDays,
  CreditCard,
  Dumbbell,
  LayoutGrid,
  PartyPopper,
  Users,
  Wallet,
} from "lucide-react";
import {
  diasAtrasISO,
  fetchAssiduidade,
  fetchDemandaListaEspera,
  fetchHorarios,
  fetchOcupacao,
  fetchPlanos,
  fetchTodosContratos,
  mapaContratos,
  qk,
  statusContrato,
} from "@/lib/queries";
import { listarAlunos } from "@/lib/admin-users.functions";
import { formatDateLong, formatHora } from "@/lib/format";
import { AdminGuard } from "@/components/AdminGuard";
import { EmptyState, PageTitle } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: () => (
    <AdminGuard>
      <AdminDashboard />
    </AdminGuard>
  ),
  head: () => ({
    meta: [
      { title: "Painel do administrador — Wine Barbell Club" },
      { name: "description", content: "Visão geral de alunos, turmas e ocupação do estúdio." },
      { property: "og:title", content: "Painel do administrador — Wine Barbell Club" },
      { property: "og:description", content: "Gestão completa do Wine Barbell Club." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const secoes = [
  { to: "/admin/alunos", label: "Alunos", icon: Users },
  { to: "/admin/planos", label: "Planos", icon: CreditCard },
  { to: "/admin/eventos", label: "Eventos", icon: PartyPopper },
  { to: "/admin/assiduidade", label: "Assiduidade", icon: Activity },
  { to: "/admin/horarios", label: "Horários", icon: CalendarClock },
  { to: "/admin/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/admin/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/admin/modalidades", label: "Modalidades", icon: LayoutGrid },
  { to: "/admin/treinos", label: "Treinos", icon: Dumbbell },
  { to: "/admin/notificacoes", label: "Notificações", icon: Bell },
] as const;

function AdminDashboard() {
  const carregarAlunos = useServerFn(listarAlunos);
  const { data: alunos = [] } = useQuery({
    queryKey: ["admin-alunos"],
    queryFn: () => carregarAlunos(),
  });
  const { data: contratos = [] } = useQuery({
    queryKey: qk.contratos(),
    queryFn: fetchTodosContratos,
  });
  const { data: planos = [] } = useQuery({ queryKey: qk.planos, queryFn: fetchPlanos });
  const contratoPorAluno = mapaContratos(contratos as any);

  const { data: horarios = [] } = useQuery({ queryKey: qk.horarios, queryFn: () => fetchHorarios(true) });
  const { data: ocupacao } = useQuery({ queryKey: ["ocupacao"], queryFn: fetchOcupacao });
  const { data: reservas = [] } = useQuery({
    queryKey: ["assiduidade", 30],
    queryFn: () => fetchAssiduidade(diasAtrasISO(30)),
  });
  const { data: demandaFila = [] } = useQuery({
    queryKey: ["demanda-lista-espera", 30],
    queryFn: () => fetchDemandaListaEspera(diasAtrasISO(30)),
  });

  const lista = alunos as any[];
  const st = (a: any) => statusContrato(contratoPorAluno.get(a.id));
  const totalAlunos = lista.length;
  const ativos = lista.filter((a) => a.ativo !== false && st(a) === "ativo").length;
  const semPlano = lista.filter((a) => {
    const s = st(a);
    return !a.plano_id && (!s || s === "cancelado");
  }).length;
  const proximos = lista.filter((a) => st(a) === "proximo_vencimento").length;
  const vencidos = lista.filter((a) => st(a) === "vencido").length;
  const pendentes = lista.filter((a) => !a.user_id).length;

  // Alunos por plano (sem plano nunca é contado como ilimitado).
  const porPlano = new Map<string, number>();
  for (const a of lista) {
    if (!a.plano_id) continue;
    porPlano.set(a.plano_id, (porPlano.get(a.plano_id) ?? 0) + 1);
  }
  const nomePlano = new Map((planos as any[]).map((p) => [p.id, p.nome]));
  porPlano.set("sem-plano", semPlano);

  // Assiduidade dos últimos 30 dias.
  const confirmadas = reservas.filter((r) => r.status === "confirmada" && !r.horarios?.cancelada);
  const presentes = confirmadas.filter((r) => r.presenca === "presente").length;
  const faltas = confirmadas.filter((r) => r.presenca === "falta").length;
  const frequencia = presentes + faltas > 0 ? Math.round((presentes / (presentes + faltas)) * 100) : 0;
  const porAula = new Map<string, { usados: number; limite: number }>();
  for (const r of confirmadas) {
    const h = r.horarios;
    if (!h?.limite_vagas) continue;
    const at = porAula.get(r.horario_id) ?? { usados: 0, limite: h.limite_vagas };
    at.usados += 1;
    porAula.set(r.horario_id, at);
  }
  const aulas = [...porAula.values()];
  const ocupacaoMedia =
    aulas.length > 0
      ? Math.round((aulas.reduce((acc, a) => acc + a.usados / a.limite, 0) / aulas.length) * 100)
      : 0;

  const modalidadesProcuradas = new Map<string, number>();
  const horariosProcurados = new Map<string, number>();
  for (const r of confirmadas) {
    const modalidade = r.horarios?.modalidades?.nome ?? "Aula";
    const horario = r.horarios?.horario?.slice(0, 5) ?? "—";
    modalidadesProcuradas.set(modalidade, (modalidadesProcuradas.get(modalidade) ?? 0) + 1);
    horariosProcurados.set(horario, (horariosProcurados.get(horario) ?? 0) + 1);
  }
  for (const entrada of demandaFila) {
    const modalidade = entrada.horarios?.modalidades?.nome ?? "Aula";
    const horario = entrada.horarios?.horario?.slice(0, 5) ?? "—";
    modalidadesProcuradas.set(modalidade, (modalidadesProcuradas.get(modalidade) ?? 0) + 1);
    horariosProcurados.set(horario, (horariosProcurados.get(horario) ?? 0) + 1);
  }
  const topModalidades = [...modalidadesProcuradas.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const topHorarios = [...horariosProcurados.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  const lotadas = horarios.filter((h) => (ocupacao?.get(h.id) ?? 0) >= h.limite_vagas).length;
  const proximasAulas = horarios.slice(0, 5);

  return (
    <div className="space-y-6">
      <PageTitle eyebrow="Administração" title="Painel" />

      <section>
        <p className="eyebrow mb-2">Alunos</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Total de alunos" valor={totalAlunos} filtro="todos" />
          <Stat label="Alunos ativos" valor={ativos} filtro="ativos" />
          <Stat label="Sem plano" valor={semPlano} filtro="sem_plano" />
          <Stat label="Próximos do vencimento" valor={proximos} filtro="proximo_vencimento" />
          <Stat label="Planos vencidos" valor={vencidos} filtro="vencidos" />
          <Stat label="Pendentes de conta" valor={pendentes} filtro="sem_conta" />
        </div>
      </section>

      <section>
        <p className="eyebrow mb-2">Assiduidade (30 dias)</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Frequência média" valor={`${frequencia}%`} />
          <Stat label="Faltas" valor={faltas} />
          <Stat label="Ocupação média" valor={`${ocupacaoMedia}%`} />
          <Stat label="Turmas lotadas" valor={lotadas} />
        </div>
      </section>

      <section>
        <p className="eyebrow mb-2">Alunos por plano</p>
        {porPlano.size === 1 && semPlano === 0 ? (
          <EmptyState>Nenhum aluno com plano ativo.</EmptyState>
        ) : (
          <ul className="surface-panel divide-y divide-border">
            {[...porPlano.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([id, qtd]) => (
                <li key={id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                   <span className="truncate text-foreground">
                     {id === "sem-plano" ? "Sem plano" : (nomePlano.get(id) ?? "Plano")}
                   </span>
                  <span className="shrink-0 text-xs font-semibold text-primary">{qtd} aluno(s)</span>
                </li>
              ))}
          </ul>
        )}
      </section>

      <section>
        <p className="eyebrow mb-2">Mais procurados (30 dias)</p>
        {topModalidades.length === 0 ? (
          <EmptyState>Sem reservas confirmadas no período.</EmptyState>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Ranking titulo="Turmas" itens={topModalidades} />
            <Ranking titulo="Horários" itens={topHorarios} />
          </div>
        )}
      </section>

      <section>
        <p className="eyebrow mb-2">Gestão</p>
        <div className="grid grid-cols-4 gap-2">
          {secoes.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="surface-panel flex flex-col items-center gap-1.5 px-1 py-3 text-center text-[10px] font-medium text-foreground transition-colors hover:border-primary/60"
            >
              <Icon className="size-4 text-primary" />
              {label}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <p className="eyebrow mb-2">Próximas aulas</p>
        {proximasAulas.length === 0 ? (
          <EmptyState>Nenhuma aula agendada.</EmptyState>
        ) : (
          <div className="space-y-2">
            {proximasAulas.map((h) => {
              const usados = ocupacao?.get(h.id) ?? 0;
              return (
                <div
                  key={h.id}
                  className="surface-panel flex items-center justify-between px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-foreground">{h.modalidades?.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateLong(h.data)} · {formatHora(h.horario)} · {h.instrutor}
                    </p>
                  </div>
                  <span
                    className={
                      usados >= h.limite_vagas
                        ? "text-xs font-semibold text-destructive"
                        : "text-xs font-semibold text-primary"
                    }
                  >
                    {usados}/{h.limite_vagas}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Ranking({ titulo, itens }: { titulo: string; itens: Array<[string, number]> }) {
  return (
    <div className="surface-panel overflow-hidden">
      <p className="border-b border-border px-4 py-2.5 text-xs font-semibold text-foreground">
        {titulo}
      </p>
      <ol className="divide-y divide-border">
        {itens.map(([nome, quantidade], indice) => (
          <li key={nome} className="flex items-center gap-3 px-4 py-2.5 text-sm">
            <span className="font-display text-lg text-primary">{indice + 1}</span>
            <span className="min-w-0 flex-1 truncate text-foreground">{nome}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {quantidade} interesse{quantidade === 1 ? "" : "s"}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Stat({
  label,
  valor,
  filtro,
}: {
  label: string;
  valor: number | string;
  filtro?: string;
}) {
  const conteudo = (
    <>
      <p className="font-display text-3xl text-gold-gradient">{valor}</p>
      <p className="mt-1 text-[10px] tracking-wide text-muted-foreground uppercase">{label}</p>
    </>
  );
  if (!filtro) return <div className="surface-panel px-3 py-4 text-center">{conteudo}</div>;
  return (
    <Link
      to="/admin/alunos"
      search={{ filtro }}
      className="surface-panel px-3 py-4 text-center transition-colors hover:border-primary/60"
    >
      {conteudo}
    </Link>
  );
}
