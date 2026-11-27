import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarPlus, Clock, User2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  fetchContratos,
  fetchHorarios,
  fetchMeuPlano,
  fetchMinhaListaEspera,
  fetchMinhasReservas,
  fetchOcupacao,
  qk,
  statusContrato,
  type Horario,
} from "@/lib/queries";

import {
  MSG_CLASS_CANCELLED,
  MSG_CLASS_FULL,
  MSG_DUPLICATE_BOOKING,
  MSG_NO_PLAN,
  MSG_PLAN_EXPIRED,
  MSG_TURMA_NAO_PERMITIDA,
  MSG_ACESSO_LIVRE,
  MSG_CANCEL_NOT_ALLOWED,
  MSG_CLASS_ALREADY_STARTED,
  msgPlanoVenceAntes,
  msgDiaNaoPermitido,
  msgLimiteMensal,
  canBookClass,
  msgLimiteSemanal,
  reasonFromError,
} from "@/lib/booking";

import { formatDateLong, formatHora, todayISO } from "@/lib/format";
import { googleCalendarUrl } from "@/lib/calendar";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState, PageTitle } from "@/components/AppShell";
import { ehDiaAcessoLivre } from "@/lib/plano-format";

export const Route = createFileRoute("/_authenticated/agenda")({
  component: Agenda,
  head: () => ({
    meta: [
      { title: "Agenda de aulas — Wine Barbell Club" },
      {
        name: "description",
        content: "Veja as próximas aulas, vagas restantes e reserve seu lugar no Wine Barbell Club.",
      },
      { property: "og:title", content: "Agenda de aulas — Wine Barbell Club" },
      { property: "og:description", content: "Próximas aulas e reservas do estúdio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Agenda() {
  const { aluno } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: horarios = [], isLoading } = useQuery({
    queryKey: qk.horarios,
    queryFn: () => fetchHorarios(true),
  });
  const { data: ocupacao } = useQuery({ queryKey: ["ocupacao"], queryFn: fetchOcupacao });
  const { data: reservas = [] } = useQuery({
    queryKey: [...qk.reservas, aluno?.id],
    queryFn: () => fetchMinhasReservas(aluno?.id),
    enabled: Boolean(aluno?.id),
  });

  const { data: plano, isPending: planoPendente } = useQuery({
    queryKey: [...qk.planos, aluno?.plano_id],
    queryFn: () => fetchMeuPlano(aluno?.plano_id),
    enabled: Boolean(aluno?.plano_id),
  });
  const { data: contratos = [], isPending: contratosPendentes } = useQuery({
    queryKey: qk.contratos(aluno?.id),
    queryFn: () => fetchContratos(aluno?.id),
    enabled: Boolean(aluno?.id),
    refetchInterval: 15000,
  });
  const contratoAtual = contratos.find((c) =>
    c.plano_id === aluno?.plano_id &&
    (statusContrato(c) === "ativo" || statusContrato(c) === "proximo_vencimento") &&
    Boolean(c.proximo_vencimento && c.proximo_vencimento >= todayISO()),
  );
  const contratoVigente = Boolean(contratoAtual);
  const vencimento = contratoAtual?.proximo_vencimento ?? null;

  const { data: dayUsesDisponiveis = 0, isPending: dayUsesPendentes } = useQuery({
    queryKey: ["day-uses", "disponiveis", aluno?.id],
    enabled: Boolean(aluno?.id),
    queryFn: async () => {
      const { count, error } = await supabase
        .from("day_uses")
        .select("id", { count: "exact", head: true })
        .eq("aluno_id", aluno?.id ?? "")
        .eq("status", "disponivel");
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: espera = [] } = useQuery({
    queryKey: ["lista-espera", aluno?.id],
    enabled: Boolean(aluno?.id),
    queryFn: () => fetchMinhaListaEspera(aluno?.id),
  });
  const esperaPorAula = new Map(espera.map((e) => [e.horario_id, e]));

  const entrarEspera = useMutation({
    mutationFn: async (h: Horario) => {
      const { error } = await supabase.rpc("entrar_lista_espera", { p_horario_id: h.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Você entrou na lista de espera. Avisaremos se abrir vaga.");
      qc.invalidateQueries({ queryKey: ["lista-espera"] });
    },
    onError: (e: Error) => {
      const msg = e.message ?? "";
      if (/CLASS_HAS_SPOTS/.test(msg)) return toast.error("Esta turma voltou a ter vagas. Reserve normalmente.");
      if (/ALREADY_BOOKED/.test(msg)) return toast.error("Você já tem reserva nesta aula.");
      toast.error("Não foi possível entrar na lista de espera.");
    },
  });

  const sairEspera = useMutation({
    mutationFn: async (h: Horario) => {
      const { error } = await supabase.rpc("sair_lista_espera", { p_horario_id: h.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Você saiu da lista de espera.");
      qc.invalidateQueries({ queryKey: ["lista-espera"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const acessoCarregando = !aluno?.id || contratosPendentes || dayUsesPendentes || (Boolean(aluno?.plano_id) && planoPendente);
  const semPlano = !acessoCarregando && !contratoVigente && dayUsesDisponiveis === 0;

  const minhas = new Map<string, any>(
    (reservas as any[]).map((r) => [r.horario_id as string, r]),
  );


  const [confirmarReserva, setConfirmarReserva] = useState<Horario | null>(null);
  const [confirmarCancelar, setConfirmarCancelar] = useState<
    { reservaId: string; horario: Horario } | null
  >(null);
  const [aulaCalendario, setAulaCalendario] = useState<Horario | null>(null);
  const [limiteMsg, setLimiteMsg] = useState<string | null>(null);
  const [semPlanoMsg, setSemPlanoMsg] = useState<string | null>(null);

  function verificarEReservar(h: Horario) {
    if (acessoCarregando) return;
    const check = canBookClass({
      aluno,
      plano,
      contratoVigente,
      vencimento,
      reservas: reservas as any[],
      dayUsesDisponiveis,
      horario: h,
      ocupadas: ocupacao?.get(h.id) ?? 0,
    });
    if (check.allowed) {
      reservar.mutate(h);
      return;
    }
    switch (check.reason) {
      case "NO_PLAN":
        setSemPlanoMsg(MSG_NO_PLAN);
        return;
      case "WEEKLY_LIMIT_REACHED":
        setLimiteMsg(msgLimiteSemanal(check.limite));
        return;
      case "MONTHLY_LIMIT_REACHED":
        setLimiteMsg(msgLimiteMensal(check.limite));
        return;
      case "DAY_NOT_ALLOWED":
        setLimiteMsg(msgDiaNaoPermitido(plano));
        return;
      case "FREE_ACCESS_DAY":
        setLimiteMsg(MSG_ACESSO_LIVRE);
        return;
      case "CLASS_NOT_ALLOWED":
        setLimiteMsg(MSG_TURMA_NAO_PERMITIDA);
        return;
      case "DUPLICATE_BOOKING":
        toast.error(MSG_DUPLICATE_BOOKING);
        return;
      case "CLASS_FULL":
        toast.error(MSG_CLASS_FULL);
        return;
      case "CLASS_CANCELLED":
        toast.error(MSG_CLASS_CANCELLED);
        return;
      case "PLAN_EXPIRED":
        setSemPlanoMsg(msgPlanoVenceAntes(vencimento));
        return;
      case "CLASS_ALREADY_STARTED":
        toast.error(MSG_CLASS_ALREADY_STARTED);
        return;
      default:
        toast.error("Não foi possível reservar esta aula.");
    }
  }


  const reservar = useMutation({
    mutationFn: async (horario: Horario) => {
      if (!aluno?.id) throw new Error("Ficha de aluno não encontrada.");
      if (acessoCarregando) throw new Error("Aguarde o carregamento do seu plano.");
      if (!contratoVigente && dayUsesDisponiveis === 0) throw new Error("NO_ACTIVE_PLAN");

      const existente = minhas.get(horario.id);
      if (existente) {
        const { error } = await supabase.rpc("reativar_reserva", {
          p_reserva_id: existente.id,
        });
        if (error) throw error;
        return horario;
      }
      const { error } = await supabase
        .from("reservas")
        .insert({ aluno_id: aluno.id, horario_id: horario.id });
      if (error) throw error;
      return horario;
    },
    onSuccess: (horario) => {
      toast.success("Aula reservada!");
      qc.invalidateQueries({ queryKey: qk.reservas });
      qc.invalidateQueries({ queryKey: ["ocupacao"] });
      qc.invalidateQueries({ queryKey: ["day-uses"] });
      qc.invalidateQueries({ queryKey: ["lista-espera"] });
      setAulaCalendario(horario);
    },

    onError: (e: Error) => {
      const msg = e.message ?? "";
      const reason = reasonFromError(msg);
      if (reason === "NO_PLAN") {
        setSemPlanoMsg(MSG_NO_PLAN);
        return;
      }
      if (reason === "PLAN_EXPIRED") {
        setSemPlanoMsg(/PLAN_EXPIRED/.test(msg) ? msgPlanoVenceAntes(vencimento) : MSG_PLAN_EXPIRED);
        return;
      }
      if (reason === "CLASS_ALREADY_STARTED") {
        toast.error(MSG_CLASS_ALREADY_STARTED);
        return;
      }
      if (reason === "DUPLICATE_BOOKING") {
        toast.error(MSG_DUPLICATE_BOOKING);
        return;
      }
      if (reason === "WEEKLY_LIMIT_REACHED") {
        setLimiteMsg(msgLimiteSemanal(plano?.limite_semanal));
        return;
      }
      if (reason === "MONTHLY_LIMIT_REACHED") {
        setLimiteMsg(msgLimiteMensal(plano?.limite_mensal));
        return;
      }
      if (reason === "FREE_ACCESS_DAY") {
        setLimiteMsg(MSG_ACESSO_LIVRE);
        return;
      }
      if (reason === "DAY_NOT_ALLOWED") {
        setLimiteMsg(msgDiaNaoPermitido(plano));
        return;
      }
      if (reason === "CLASS_NOT_ALLOWED") {
        setLimiteMsg(MSG_TURMA_NAO_PERMITIDA);
        return;
      }
      if (/lotada|CLASS_NOT_AVAILABLE/i.test(msg)) {
        toast.error("Esta turma acabou de lotar. Escolha outro horário.");
        return;
      }
      if (/INACTIVE_STUDENT/i.test(msg)) {
        toast.error("Sua ficha de aluno está inativa. Fale com a administração.");
        return;
      }
      // Nunca mostrar mensagem técnica do banco ao aluno.
      console.error("Erro ao reservar:", msg);
      toast.error("Não foi possível reservar esta aula. Tente novamente ou fale com a administração.");
    },
  });

  const cancelar = useMutation({
    mutationFn: async (reservaId: string) => {
      const { error } = await supabase
        .from("reservas")
        .update({ status: "cancelada" })
        .eq("id", reservaId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reserva cancelada.");
      qc.invalidateQueries({ queryKey: qk.reservas });
      qc.invalidateQueries({ queryKey: ["ocupacao"] });
      qc.invalidateQueries({ queryKey: ["day-uses"] });
      qc.invalidateQueries({ queryKey: ["lista-espera"] });
    },
    onError: (e: Error) => {
      if (reasonFromError(e.message) === "CANCEL_NOT_ALLOWED") {
        toast.error(MSG_CANCEL_NOT_ALLOWED);
        return;
      }
      console.error("Erro ao cancelar:", e.message);
      toast.error("Não foi possível cancelar. Tente novamente ou fale com a administração.");
    },
  });

  const porData = horarios.reduce<Record<string, typeof horarios>>((acc, h) => {
    (acc[h.data] ||= []).push(h);
    return acc;
  }, {});

  return (
    <div>
      <PageTitle eyebrow="Reserve seu lugar" title="Agenda" />

      {acessoCarregando && (
        <p className="mb-4 text-sm text-muted-foreground" role="status">Carregando seu plano…</p>
      )}

      {semPlano && (
        <div className="surface-panel mb-4 flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <p className="text-sm text-muted-foreground">{MSG_NO_PLAN}</p>
          <Button size="sm" onClick={() => navigate({ to: "/planos" })}>
            Ver Planos
          </Button>
        </div>
      )}

      {isLoading ? (
        <EmptyState>Carregando aulas…</EmptyState>
      ) : horarios.length === 0 ? (
        <EmptyState>Nenhuma aula publicada para os próximos dias.</EmptyState>
      ) : (
        <div className="space-y-6">
          {Object.entries(porData).map(([data, lista]) => (
            <section key={data}>
              <h2 className="eyebrow mb-2">{formatDateLong(data)}</h2>
              {contratoVigente && ehDiaAcessoLivre(plano, data) && (
                <p className="surface-panel mb-2 px-4 py-2 text-xs text-primary">
                  Acesso livre para treino de força neste dia, sem reserva de aula.
                </p>
              )}
              <div className="space-y-2">
                {lista.map((h) => {
                  const usados = ocupacao?.get(h.id) ?? 0;
                  const restantes = Math.max(h.limite_vagas - usados, 0);
                  const minha = minhas.get(h.id);
                  const confirmada = minha?.status === "confirmada";
                  const lotada = restantes <= 0 && !confirmada;
                  const fila = esperaPorAula.get(h.id) as any;
                  const naFila =
                    fila?.status === "aguardando" || fila?.status === "oportunidade_disponivel";
                  const oportunidade =
                    fila?.status === "oportunidade_disponivel" &&
                    (!fila?.oportunidade_expira_em ||
                      new Date(fila.oportunidade_expira_em) > new Date());

                  return (
                    <article
                      key={h.id}
                      className="surface-panel flex items-center gap-3 px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-lg text-foreground">
                          {h.modalidades?.nome ?? "Aula"}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="size-3.5" />
                            {formatHora(h.horario)}
                          </span>
                          <span className="flex items-center gap-1">
                            <User2 className="size-3.5" />
                            {h.instrutor}
                          </span>
                          <span className={restantes <= 2 ? "text-primary" : undefined}>
                            {restantes} vaga{restantes === 1 ? "" : "s"}
                          </span>
                        </div>
                      </div>

                      {h.cancelada ? (
                        <span className="rounded-md bg-destructive/15 px-2.5 py-1 text-[11px] font-semibold text-destructive">
                          Cancelada
                        </span>
                      ) : confirmada ? (
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Adicionar ao Google Agenda"
                            onClick={() => setAulaCalendario(h)}
                          >
                            <CalendarPlus className="size-4 text-primary" />
                          </Button>
                          {new Date(`${h.data}T${String(h.horario).slice(0, 5)}:00-03:00`) > new Date() &&
                          minha?.presenca !== "presente" &&
                          !minha?.checkin_em ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setConfirmarCancelar({ reservaId: minha.id, horario: h })
                              }
                            >
                              Cancelar
                            </Button>
                          ) : (
                            <span className="text-[11px] font-semibold text-muted-foreground">Reservada</span>
                          )}
                        </div>
                      ) : naFila && oportunidade ? (
                        <div className="shrink-0 text-right">
                          <p className="mb-1 text-[11px] font-semibold text-primary">
                            Oportunidade disponível
                          </p>
                          <Button
                            size="sm"
                            disabled={reservar.isPending || acessoCarregando}
                            onClick={() =>
                              semPlano ? setSemPlanoMsg(MSG_NO_PLAN) : setConfirmarReserva(h)
                            }
                          >
                            Reservar vaga
                          </Button>
                        </div>
                      ) : naFila ? (
                        <div className="shrink-0 text-right">
                          <p className="mb-1 text-[11px] font-semibold text-muted-foreground">
                            Na lista de espera
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={sairEspera.isPending}
                            onClick={() => sairEspera.mutate(h)}
                          >
                            Sair da lista
                          </Button>
                        </div>
                      ) : lotada ? (
                        <Button
                          size="sm"
                          variant="outline"
                            disabled={entrarEspera.isPending || acessoCarregando}
                          onClick={() =>
                            semPlano ? setSemPlanoMsg(MSG_NO_PLAN) : entrarEspera.mutate(h)
                          }
                        >
                          Entrar na lista de espera
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled={reservar.isPending || acessoCarregando}
                          onClick={() =>
                            semPlano ? setSemPlanoMsg(MSG_NO_PLAN) : setConfirmarReserva(h)
                          }
                        >
                          Reservar
                        </Button>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <AlertDialog
        open={Boolean(confirmarReserva)}
        onOpenChange={(o) => !o && setConfirmarReserva(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar reserva?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmarReserva
                ? `${confirmarReserva.modalidades?.nome ?? "Aula"} · ${formatDateLong(
                    confirmarReserva.data,
                  )} às ${formatHora(confirmarReserva.horario)}.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmarReserva) verificarEReservar(confirmarReserva);
                setConfirmarReserva(null);
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(confirmarCancelar)}
        onOpenChange={(o) => !o && setConfirmarCancelar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar esta reserva?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmarCancelar
                ? `Você perderá sua vaga em ${
                    confirmarCancelar.horario.modalidades?.nome ?? "aula"
                  } de ${formatDateLong(confirmarCancelar.horario.data)} às ${formatHora(
                    confirmarCancelar.horario.horario,
                  )}.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter reserva</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmarCancelar) cancelar.mutate(confirmarCancelar.reservaId);
                setConfirmarCancelar(null);
              }}
            >
              Cancelar aula
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(limiteMsg)} onOpenChange={(o) => !o && setLimiteMsg(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{/acesso livre/i.test(limiteMsg ?? "") ? "Dia de acesso livre" : /dia|turma/i.test(limiteMsg ?? "") ? "Fora das regras do seu plano" : /mês/i.test(limiteMsg ?? "") ? "Limite mensal do plano atingido" : "Limite semanal do plano atingido"}</AlertDialogTitle>
            <AlertDialogDescription>{limiteMsg}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setLimiteMsg(null)}>Entendi</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setLimiteMsg(null);
                navigate({ to: "/planos" });
              }}
            >
              Ver Planos / Fazer Upgrade
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(semPlanoMsg)} onOpenChange={(o) => !o && setSemPlanoMsg(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você ainda não tem um plano ativo</AlertDialogTitle>
            <AlertDialogDescription>{semPlanoMsg}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSemPlanoMsg(null)}>Agora não</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setSemPlanoMsg(null);
                navigate({ to: "/planos" });
              }}
            >
              Ver Planos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={Boolean(aulaCalendario)}
        onOpenChange={(o) => !o && setAulaCalendario(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Adicionar ao Google Agenda?</DialogTitle>
            <DialogDescription>
              {aulaCalendario
                ? `Criar um lembrete de ${
                    aulaCalendario.modalidades?.nome ?? "aula"
                  } em ${formatDateLong(aulaCalendario.data)} às ${formatHora(
                    aulaCalendario.horario,
                  )}.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setAulaCalendario(null)}>
              Agora não
            </Button>
            <Button
              onClick={() => {
                if (aulaCalendario) {
                  window.open(
                    googleCalendarUrl({
                      titulo: `${aulaCalendario.modalidades?.nome ?? "Aula"} — Wine Barbell Club`,
                      data: aulaCalendario.data,
                      horario: aulaCalendario.horario,
                      detalhes: `Instrutor: ${aulaCalendario.instrutor}`,
                      local: "Wine Barbell Club",
                    }),
                    "_blank",
                    "noopener,noreferrer",
                  );
                }
                setAulaCalendario(null);
              }}
            >
              <CalendarPlus className="size-4" /> Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
