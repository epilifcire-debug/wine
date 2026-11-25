import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { MSG_BEM_VINDO } from "@/lib/booking";
import { CalendarDays, Dumbbell, LayoutGrid, TrendingUp, User, Clock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  aulasNaSemana,
  fetchContratos,
  fetchMeuPlano,
  fetchMinhasReservas,
  fetchNotificacoes,
  qk,
  statusContrato,
} from "@/lib/queries";
import {
  firstName,
  formatDateLong,
  formatHora,
  saudacao,
  todayISO,
  tratamentoAluno,
} from "@/lib/format";
import { EmptyState } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/app")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Meu painel — Wine Barbell Club" },
      { name: "description", content: "Próxima aula, atalhos e avisos do Wine Barbell Club." },
      { property: "og:title", content: "Meu painel — Wine Barbell Club" },
      { property: "og:description", content: "Sua próxima aula e atalhos rápidos do estúdio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const atalhos = [
  { to: "/agenda", label: "Agendar aula", icon: CalendarDays },
  { to: "/wod", label: "WOD do dia", icon: Dumbbell },
  { to: "/modalidades", label: "Modalidades", icon: LayoutGrid },
  { to: "/performance", label: "Performance", icon: TrendingUp },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

function Dashboard() {
  const { perfil, aluno, isAdmin } = useAuth();
  const navigate = useNavigate();
  const avisado = useRef(false);

  const semPlano = !isAdmin && Boolean(aluno?.id) && !aluno?.plano_id;

  const { data: reservas = [] } = useQuery({
    queryKey: [...qk.reservas, aluno?.id],
    queryFn: () => fetchMinhasReservas(aluno?.id),
    enabled: Boolean(aluno?.id),
  });

  const { data: plano } = useQuery({
    queryKey: [...qk.planos, aluno?.plano_id],
    queryFn: () => fetchMeuPlano(aluno?.plano_id),
    enabled: Boolean(aluno?.plano_id),
  });
  const { data: contratos = [], isLoading: carregandoContratos } = useQuery({
    queryKey: qk.contratos(aluno?.id),
    queryFn: () => fetchContratos(aluno?.id),
    enabled: Boolean(aluno?.id),
    refetchInterval: 15000,
  });
  const pendente = contratos.find((c) => c.status === "aguardando_pagamento");

  useEffect(() => {
    if (!semPlano || pendente || carregandoContratos || avisado.current) return;
    avisado.current = true;
    toast.info(MSG_BEM_VINDO);
    navigate({ to: "/planos" });
  }, [semPlano, pendente, carregandoContratos, navigate]);

  const usadas = aulasNaSemana(reservas as any[]);
  const planoAtivo = Boolean(plano?.ativo && contratos.some((c) =>
    c.plano_id === aluno?.plano_id &&
    (statusContrato(c) === "ativo" || statusContrato(c) === "proximo_vencimento") &&
    Boolean(c.proximo_vencimento && c.proximo_vencimento >= todayISO()),
  ));
  const ilimitado = planoAtivo && (plano as any)?.ilimitado === true;
  const restantesSemana =
    plano?.limite_semanal != null ? Math.max(plano.limite_semanal - usadas, 0) : null;

  const { data: avisos = [] } = useQuery({
    queryKey: qk.notificacoes,
    queryFn: fetchNotificacoes,
  });

  const proxima = (reservas as any[])
    .filter((r) => r.status === "confirmada" && r.horarios && r.horarios.data >= todayISO())
    .sort((a, b) =>
      `${a.horarios.data}${a.horarios.horario}`.localeCompare(
        `${b.horarios.data}${b.horarios.horario}`,
      ),
    )[0];

  return (
    <div className="space-y-6">
      <section>
        <p className="eyebrow">{saudacao()}</p>
        <h1 className="font-display text-4xl leading-none text-foreground">
          {isAdmin ? "" : `${tratamentoAluno((aluno as any)?.genero)} `}
          {firstName(perfil?.nome ?? aluno?.nome)}
        </h1>

        {isAdmin && (
          <Link to="/admin" className="mt-2 inline-block text-xs font-semibold text-primary">
            Você é administrador → abrir painel de gestão
          </Link>
        )}
      </section>

      {!isAdmin &&
        (planoAtivo ? (
          <Link
            to="/financeiro"
            className="surface-panel flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:border-primary/60"
          >
            <div className="min-w-0">
              <p className="eyebrow">Meu plano</p>
              <p className="truncate font-display text-xl text-gold-gradient">{plano?.nome}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-display text-2xl text-foreground">
                {ilimitado ? "∞" : (restantesSemana ?? 0)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {ilimitado ? "aulas ilimitadas" : "aulas restantes"}
              </p>
            </div>
          </Link>
        ) : (
          <section className="surface-panel px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="eyebrow">Meu plano</p>
                <p className="font-display text-xl text-gold-gradient">{pendente ? `${pendente.planos?.nome ?? "Plano selecionado"} · Aguardando pagamento` : "Sem plano ativo"}</p>
                {pendente && <p className="text-sm text-muted-foreground">{(pendente.valor_centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} · Procure a administração para realizar o pagamento.</p>}
              </div>
              <div className="shrink-0 text-right">
                <p className="font-display text-2xl text-foreground">0</p>
                <p className="text-[11px] text-muted-foreground">aulas disponíveis</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                to="/planos"
                className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
              >
                Escolher plano
              </Link>
              <Link
                to="/planos"
                className="rounded-md border border-border px-3 py-2 text-xs font-semibold text-foreground"
              >
                Comprar Day Use
              </Link>
            </div>
          </section>
        ))}

      <section className="surface-panel overflow-hidden">
        <div className="border-b border-border px-5 py-3">
          <p className="eyebrow">Próxima aula</p>
        </div>
        {proxima ? (
          <div className="px-5 py-4">
            <p className="font-display text-2xl text-gold-gradient">
              {proxima.horarios.modalidades?.nome ?? "Aula"}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-4" />
                {formatDateLong(proxima.horarios.data)}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="size-4" />
                {formatHora(proxima.horarios.horario)}
              </span>
              <span>Prof. {proxima.horarios.instrutor}</span>
            </div>
          </div>
        ) : (
          <div className="px-5 py-6 text-sm text-muted-foreground">
            Você ainda não tem aula reservada.{" "}
            <Link to="/agenda" className="font-semibold text-primary">
              Ver agenda
            </Link>
          </div>
        )}
      </section>

      <section>
        <p className="eyebrow mb-2">Atalhos</p>
        <div className="grid grid-cols-3 gap-3">
          {atalhos.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="surface-panel flex flex-col items-center gap-2 px-2 py-4 text-center text-[11px] font-medium text-foreground transition-colors hover:border-primary/60"
            >
              <Icon className="size-5 text-primary" />
              {label}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <p className="eyebrow mb-2">Avisos recentes</p>
        {avisos.length === 0 ? (
          <EmptyState>Nenhum comunicado por enquanto.</EmptyState>
        ) : (
          <div className="space-y-2">
            {avisos.slice(0, 3).map((n: any) =>
              n.evento_id ? (
                <Link
                  key={n.id}
                  to="/eventos"
                  className="surface-panel block px-4 py-3 transition-colors hover:border-primary"
                >
                  <h2 className="text-sm font-semibold text-foreground">{n.titulo}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{n.mensagem}</p>
                  <p className="mt-1 text-xs font-semibold text-primary">Ver evento</p>
                </Link>
              ) : (
                <article key={n.id} className="surface-panel px-4 py-3">
                  <h2 className="text-sm font-semibold text-foreground">{n.titulo}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{n.mensagem}</p>
                </article>
              ),
            )}
          </div>
        )}
      </section>
    </div>
  );
}
