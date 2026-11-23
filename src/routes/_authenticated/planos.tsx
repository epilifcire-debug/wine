import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { MSG_NO_PLAN } from "@/lib/booking";
import { fetchContratos, fetchPlanos, precoBRL, qk, statusContrato, type Plano } from "@/lib/queries";
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
import { EmptyState, PageTitle } from "@/components/AppShell";
import { PlanoDetails } from "@/components/PlanoDetails";
import { formatDateBR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/planos")({
  component: PlanosAluno,
  head: () => ({
    meta: [
      { title: "Planos e upgrade — Wine Barbell Club" },
      {
        name: "description",
        content:
          "Compare os planos do Wine Barbell Club, veja limites de aulas por semana e faça upgrade do seu plano.",
      },
      { property: "og:title", content: "Planos e upgrade — Wine Barbell Club" },
      {
        property: "og:description",
        content: "Compare os planos do estúdio e escolha o ideal para sua rotina de treinos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const STATUS_DAY_USE: Record<string, string> = {
  aguardando_pagamento: "Aguardando pagamento",
  disponivel: "Disponível",
  reservado: "Reservado em uma aula",
  utilizado: "Utilizado",
  vencido: "Vencido",
  cancelado: "Cancelado",
};

function PlanosAluno() {
  const { aluno, isAdmin, refresh } = useAuth();
  const meuPlanoId = aluno?.plano_id ?? undefined;
  const qc = useQueryClient();
  const [confirmar, setConfirmar] = useState<Plano | null>(null);
  const { data: contratos = [] } = useQuery({
    queryKey: qk.contratos(aluno?.id), queryFn: () => fetchContratos(aluno?.id), enabled: Boolean(aluno?.id),
    refetchInterval: 15000,
  });
  const pendente = contratos.find((c) => c.status === "aguardando_pagamento");
  const vigente = contratos.find((c) => c.plano_id === meuPlanoId &&
    (statusContrato(c) === "ativo" || statusContrato(c) === "proximo_vencimento") &&
    Boolean(c.proximo_vencimento && c.proximo_vencimento >= new Date().toISOString().slice(0, 10)));

  const aderir = useMutation({
    mutationFn: async (plano: Plano) => {
      const { error } = await supabase.rpc("ativar_plano" as never, {
        p_plano_id: plano.id,
      } as never);
      if (error) {
        if (/PLAN_NOT_AVAILABLE/.test(error.message)) {
          throw new Error("Este plano não está disponível no momento.");
        }
        if (/NO_STUDENT_RECORD/.test(error.message)) {
          throw new Error("Não foi possível localizar sua ficha de aluno.");
        }
        throw error;
      }
    },
    onSuccess: async () => {
      await refresh();
      await qc.invalidateQueries({ queryKey: qk.contratos(aluno?.id) });
      qc.invalidateQueries({ queryKey: qk.planos });
      qc.invalidateQueries({ queryKey: qk.reservas });
      toast.success("Plano selecionado com sucesso. Para liberar totalmente o seu plano, por gentileza realize primeiro o pagamento. Procure a administração do Wine Barbell Club para realizar/confirmar o pagamento.", { duration: 9000 });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: planos = [], isLoading } = useQuery({
    queryKey: qk.planos,
    queryFn: fetchPlanos,
  });

  const ativos = planos.filter((p) => p.ativo);
  const recorrentes = ativos.filter((p) => p.tipo !== "avulso");
  const avulsos = ativos.filter((p) => p.tipo === "avulso");

  const { data: dayUses = [] } = useQuery({
    queryKey: ["day-uses", aluno?.id],
    enabled: Boolean(aluno?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("day_uses")
        .select("id, status, validade, valor_centavos, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const disponiveis = dayUses.filter((d) => d.status === "disponivel").length;
  const aguardando = dayUses.filter((d) => d.status === "aguardando_pagamento").length;

  const comprarDayUse = useMutation({
    mutationFn: async (plano: Plano) => {
      const { error } = await supabase.rpc("comprar_day_use" as never, {
        p_plano_id: plano.id,
      } as never);
      if (error) {
        if (/PLAN_NOT_AVAILABLE/.test(error.message)) {
          throw new Error("Este Day Use não está disponível no momento.");
        }
        throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["day-uses"] });
      toast.success("Day Use solicitado! Assim que o pagamento for confirmado ele fica disponível.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageTitle eyebrow="Escolha seu ritmo" title="Planos" />

      {pendente && (
        <section className="surface-panel mb-4 px-4 py-4" aria-live="polite">
          <p className="eyebrow">Plano selecionado · Aguardando pagamento</p>
          <p className="mt-2 font-display text-xl text-foreground">{pendente.planos?.nome ?? planos.find((p) => p.id === pendente.plano_id)?.nome}</p>
          <p className="text-primary">{precoBRL(pendente.valor_centavos)}</p>
          <p className="mt-2 text-sm text-muted-foreground">Para liberar totalmente o seu plano, por gentileza faça primeiro o pagamento. Procure a administração do Wine Barbell Club para realizar/confirmar o pagamento.</p>
        </section>
      )}
      {vigente && (
        <section className="surface-panel mb-4 px-4 py-4" aria-live="polite">
          <p className="eyebrow">Plano ativo</p>
          <p className="mt-2 font-display text-xl text-foreground">{vigente.planos?.nome}</p>
          <p className="text-sm text-muted-foreground">Início: {formatDateBR(vigente.data_inicio)} · Vencimento: {formatDateBR(vigente.proximo_vencimento)}</p>
          <p className="text-primary">{precoBRL(vigente.valor_centavos)}</p>
        </section>
      )}
      {!isAdmin && !meuPlanoId && !pendente && (
        <p className="surface-panel mb-4 px-4 py-3 text-sm text-muted-foreground">{MSG_NO_PLAN}</p>
      )}

      {isLoading ? (
        <EmptyState>Carregando planos…</EmptyState>
      ) : ativos.length === 0 ? (
        <EmptyState>Nenhum plano disponível no momento.</EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {recorrentes.map((p) => {
            const atual = p.id === meuPlanoId;
            return (
              <article
                key={p.id}
                className={`surface-panel flex flex-col px-4 py-4 ${atual || pendente?.plano_id === p.id ? "ring-1 ring-primary" : ""}`}
              >
                <PlanoDetails plano={p} atual={atual} />

                {!isAdmin && aluno?.id && !atual && pendente?.plano_id !== p.id && (
                  <Button
                    className="mt-auto w-full"
                    disabled={aderir.isPending}
                    onClick={() => setConfirmar(p)}
                  >
                    {meuPlanoId ? "Mudar para este plano" : "Escolher este plano"}
                  </Button>
                )}
              </article>
            );
          })}
        </div>
      )}

      <AlertDialog open={Boolean(confirmar)} onOpenChange={(o) => !o && setConfirmar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
          <AlertDialogTitle>Selecionar o plano {confirmar?.nome}?</AlertDialogTitle>
            <AlertDialogDescription>
              {precoBRL(confirmar?.preco_centavos)} · O plano ficará aguardando pagamento. Procure a administração do Wine Barbell Club para confirmar o pagamento antes de reservar aulas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmar) aderir.mutate(confirmar);
                setConfirmar(null);
              }}
            >
              Selecionar plano
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {avulsos.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-2xl text-foreground">Day Use</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Aula avulsa, sem plano. Você tem {disponiveis} disponível(is)
            {aguardando > 0 ? ` e ${aguardando} aguardando pagamento` : ""}.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {avulsos.map((p) => (
              <article key={p.id} className="surface-panel px-4 py-4">
                <PlanoDetails plano={p} />
                {!isAdmin && (
                  <Button
                    variant="outline"
                    className="mt-4 w-full"
                    disabled={comprarDayUse.isPending}
                    onClick={() => comprarDayUse.mutate(p)}
                  >
                    Comprar Day Use
                  </Button>
                )}
              </article>
            ))}
          </div>
          {dayUses.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
              {dayUses.slice(0, 6).map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3">
                  <span>{precoBRL(d.valor_centavos)}</span>
                  <span>{STATUS_DAY_USE[d.status] ?? d.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <p className="mt-6 text-sm text-muted-foreground">A liberação de um plano novo ou renovação acontece após a confirmação do pagamento pela administração.</p>
    </div>
  );
}
