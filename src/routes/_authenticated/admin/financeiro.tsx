import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  eventoLabel,
  fetchAlunos,
  fetchContratos,
  fetchHistoricoPlanos,
  fetchPagamentos,
  fetchPlanos,
  precoBRL,
  qk,
  statusContrato,
  statusLabel,
  type Contrato,
  situacaoRecorrencia,
} from "@/lib/queries";
import { formatDateBR } from "@/lib/format";
import { AdminGuard } from "@/components/AdminGuard";
import { EmptyState, PageTitle } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/admin/financeiro")({
  component: () => (
    <AdminGuard>
      <AdminFinanceiro />
    </AdminGuard>
  ),
  head: () => ({
    meta: [
      { title: "Financeiro dos alunos — Wine Barbell Club" },
      {
        name: "description",
        content: "Contratos, vigências, vencimentos e histórico de planos dos alunos do estúdio.",
      },
      { property: "og:title", content: "Financeiro dos alunos — Wine Barbell Club" },
      {
        property: "og:description",
        content: "Gestão de contratos, status de pagamento e histórico de planos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function DayUsesPendentes() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["day-uses-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("day_uses")
        .select("id, status, valor_centavos, validade, created_at, alunos(nome)")
        .in("status", ["aguardando_pagamento", "disponivel"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const atualizar = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("day_uses")
        .update({ status } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Day Use atualizado.");
      qc.invalidateQueries({ queryKey: ["day-uses-admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (data.length === 0) return null;

  return (
    <section className="surface-panel mb-4 px-4 py-3">
      <p className="eyebrow mb-2">Day Use</p>
      <ul className="space-y-2">
        {data.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 flex-1 truncate text-foreground">
              {d.alunos?.nome ?? "Aluno"}
              <span className="ml-2 text-xs text-muted-foreground">
                {precoBRL(d.valor_centavos)}
                {d.validade ? ` · vale até ${formatDateBR(d.validade)}` : ""}
              </span>
            </span>
            {d.status === "aguardando_pagamento" ? (
              <Button
                size="sm"
                onClick={() => atualizar.mutate({ id: d.id, status: "disponivel" })}
              >
                Confirmar pagamento
              </Button>
            ) : (
              <span className="text-xs font-semibold text-primary">Disponível</span>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => atualizar.mutate({ id: d.id, status: "cancelado" })}
            >
              Cancelar
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AdminFinanceiro() {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [alunoId, setAlunoId] = useState<string | null>(null);
  const [confirmarPagamento, setConfirmarPagamento] = useState<Contrato | null>(null);

  const { data: alunos = [] } = useQuery({ queryKey: qk.alunos, queryFn: fetchAlunos });
  const { data: planos = [] } = useQuery({ queryKey: qk.planos, queryFn: fetchPlanos });
  const { data: contratos = [] } = useQuery({
    queryKey: qk.contratos(alunoId ?? undefined),
    queryFn: () => fetchContratos(alunoId ?? undefined),
    enabled: Boolean(alunoId),
  });

  const { data: historico = [] } = useQuery({
    queryKey: qk.historicoPlanos(alunoId ?? undefined),
    queryFn: () => fetchHistoricoPlanos(alunoId ?? undefined),
    enabled: Boolean(alunoId),
  });

  const { data: pagamentos = [] } = useQuery({
    queryKey: qk.pagamentos(alunoId ?? undefined),
    queryFn: () => fetchPagamentos(alunoId ?? undefined),
    enabled: Boolean(alunoId),
  });

  const recorrencia = useMutation({
    mutationFn: async ({ contrato, ativa }: { contrato: Contrato; ativa: boolean }) => {
      const { error } = await supabase.rpc("definir_recorrencia" as never, {
        p_aluno_plano_id: contrato.id,
        p_ativa: ativa,
      } as never);
      if (error) throw error;
      return ativa;
    },
    onSuccess: async (ativa) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: qk.contratos(alunoId ?? undefined) }),
        qc.invalidateQueries({ queryKey: qk.contratos() }),
      ]);
      toast.success(ativa ? "Recorrência no cartão ativada." : "Recorrência desativada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pagar = useMutation({
    mutationFn: async (contrato: Contrato) => {
      const { error } = await supabase.rpc("registrar_pagamento_presencial", { p_aluno_plano_id: contrato.id });
      if (error) {
        if (/PAYMENT_ALREADY_REGISTERED/.test(error.message)) throw new Error("Pagamento já registrado para esta mensalidade.");
        if (/PAYMENT_NOT_PENDING/.test(error.message)) throw new Error("Esta mensalidade não está aguardando pagamento.");
        throw error;
      }
    },
    onSuccess: async () => {
      setConfirmarPagamento(null);
      await Promise.all([
        qc.invalidateQueries({ queryKey: qk.contratos(alunoId ?? undefined) }),
        qc.invalidateQueries({ queryKey: qk.pagamentos(alunoId ?? undefined) }),
        qc.invalidateQueries({ queryKey: qk.historicoPlanos(alunoId ?? undefined) }),
        qc.invalidateQueries({ queryKey: qk.alunos }),
        qc.invalidateQueries({ queryKey: ["admin-alunos"] }),
        qc.invalidateQueries({ queryKey: qk.planos }),
        qc.invalidateQueries({ queryKey: qk.reservas }),
      ]);
      toast.success("Pagamento registrado e plano liberado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const nomePlano = (id?: string | null) => planos.find((p) => p.id === id)?.nome ?? "Sem plano";

  const lista = (alunos as any[]).filter((a) =>
    `${a.nome} ${a.email ?? ""} ${a.codigo_wbc ?? ""} ${a.telefone ?? ""}`.toLowerCase().includes(busca.toLowerCase()),
  );
  const aluno = (alunos as any[]).find((a) => a.id === alunoId);

  return (
    <div>
      <PageTitle eyebrow="Administração" title="Financeiro" />

      <DayUsesPendentes />

      {!alunoId ? (
        <div className="space-y-3">
          <Input
            placeholder="Buscar aluno…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          {lista.length === 0 ? (
            <EmptyState>Nenhum aluno encontrado.</EmptyState>
          ) : (
            <div className="space-y-2">
              {lista.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setAlunoId(a.id)}
                  className="surface-panel flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:border-primary/60"
                >
                  <span className="text-sm font-semibold text-foreground">{a.nome} <span className="text-xs text-muted-foreground">{a.codigo_wbc}</span></span>
                  <span className="text-xs text-primary">{nomePlano(a.plano_id)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Aluno</p>
              <p className="font-display text-2xl text-foreground">{aluno?.nome}</p>
              <p className="text-sm text-muted-foreground">ID {aluno?.codigo_wbc ?? "—"}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setAlunoId(null)}>
              Trocar
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">Último pagamento: {pagamentos[0] ? formatDateBR(pagamentos[0].pago_em) : "Nenhum registrado"}</p>

          <section>
            <p className="eyebrow mb-2">Contratos</p>
            {contratos.length === 0 ? (
              <EmptyState>Nenhum contrato registrado para este aluno.</EmptyState>
            ) : (
              <div className="space-y-2">
                {contratos.map((c: Contrato) => {
                  const st = statusContrato(c)!;
                  return (
                    <article key={c.id} className="surface-panel px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {c.planos?.nome ?? nomePlano(c.plano_id)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Vigência: {formatDateBR(c.data_inicio)} →{" "}
                            {formatDateBR(c.data_fim) || "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Vencimento: {formatDateBR(c.proximo_vencimento) || "—"} ·{" "}
                            {precoBRL(c.valor_centavos)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="rounded-md bg-primary/15 px-2 py-1 text-[11px] font-semibold text-primary">
                            {statusLabel[st]}
                          </span>
                          {c.status === "aguardando_pagamento" && (
                            <Button size="sm" onClick={() => setConfirmarPagamento(c)}>Confirmar pagamento presencial</Button>
                          )}
                        </div>
                      </div>
                      {c.status !== "cancelado" && (c.recorrencia_solicitada || c.recorrencia_ativa) && (
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
                          <span className={`text-xs font-semibold ${c.recorrencia_ativa ? "text-primary" : "text-muted-foreground"}`}>
                            {situacaoRecorrencia(c)?.label}
                          </span>
                          <Button
                            size="sm"
                            variant={c.recorrencia_ativa ? "outline" : "default"}
                            disabled={recorrencia.isPending}
                            onClick={() => recorrencia.mutate({ contrato: c, ativa: !c.recorrencia_ativa })}
                          >
                            {c.recorrencia_ativa ? "Desativar recorrência" : "Ativar recorrência"}
                          </Button>
                        </div>
                      )}
                      {c.observacao && (
                        <p className="mt-2 text-xs text-muted-foreground">{c.observacao}</p>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <p className="eyebrow mb-2">Histórico financeiro</p>
            {pagamentos.length === 0 ? <EmptyState>Nenhum pagamento registrado.</EmptyState> : (
              <div className="space-y-2">
                {pagamentos.map((p) => (
                  <article key={p.id} className="surface-panel px-4 py-3 text-sm">
                    <p className="font-semibold text-foreground">{formatDateBR(p.pago_em)} · {nomePlano(p.plano_id)} · {precoBRL(p.valor_centavos)}</p>
                    <p className="text-muted-foreground">{p.forma_pagamento === "presencial" ? "Presencial" : p.forma_pagamento} · {p.status === "pago" ? "Pago" : p.status} · Registrado por: {p.registrado_por}</p>
                  </article>
                ))}
              </div>
            )}
          </section>

          <AlertDialog open={Boolean(confirmarPagamento)} onOpenChange={(open) => !open && setConfirmarPagamento(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar pagamento da mensalidade?</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-1">
                    <p>Aluno: {aluno?.nome}</p><p>ID: {aluno?.codigo_wbc ?? "—"}</p>
                    <p>Plano: {nomePlano(confirmarPagamento?.plano_id)}</p>
                    <p>Valor: {precoBRL(confirmarPagamento?.valor_centavos)}</p><p>Forma: Presencial</p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={pagar.isPending}>Cancelar</AlertDialogCancel>
                <AlertDialogAction disabled={pagar.isPending} onClick={(event) => {
                  event.preventDefault();
                  if (confirmarPagamento) pagar.mutate(confirmarPagamento);
                }}>Confirmar pagamento</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <section>
            <p className="eyebrow mb-2">Histórico de planos</p>
            {historico.length === 0 ? (
              <EmptyState>Nenhuma alteração registrada.</EmptyState>
            ) : (
              <div className="space-y-2">
                {historico.map((h: any) => (
                  <article key={h.id} className="surface-panel px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-primary">
                        {eventoLabel[h.tipo as keyof typeof eventoLabel] ?? h.tipo}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateBR(String(h.created_at).slice(0, 10))}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {nomePlano(h.plano_anterior_id)} → {nomePlano(h.plano_novo_id)}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
