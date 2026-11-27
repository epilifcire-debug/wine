import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  contratoAtual,
  eventoLabel,
  fetchContratos,
  fetchHistoricoPlanos,
  fetchMeuPlano,
  fetchPlanos,
  precoBRL,
  qk,
  statusContrato,
  statusLabel,
  type ContratoStatus,
} from "@/lib/queries";
import { formatDateBR, todayISO } from "@/lib/format";
import { itensPlano } from "@/lib/plano-format";
import { EmptyState, PageTitle } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/financeiro")({
  component: MeuPlanoFinanceiro,
  head: () => ({
    meta: [
      { title: "Meu plano e financeiro — Wine Barbell Club" },
      {
        name: "description",
        content:
          "Acompanhe seu plano atual, vigência do contrato, próximo vencimento, valor e histórico de alterações.",
      },
      { property: "og:title", content: "Meu plano e financeiro — Wine Barbell Club" },
      {
        property: "og:description",
        content: "Vigência, vencimento, status e histórico do seu plano no estúdio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const statusTone: Record<ContratoStatus, string> = {
  ativo: "bg-primary/15 text-primary",
  proximo_vencimento: "bg-amber-500/15 text-amber-500",
  vencido: "bg-destructive/15 text-destructive",
  cancelado: "bg-muted text-muted-foreground",
  aguardando_pagamento: "bg-primary/15 text-primary",
};

function MeuPlanoFinanceiro() {
  const { aluno } = useAuth();
  const alunoId = aluno?.id as string | undefined;
  const planoId = (aluno as any)?.plano_id as string | undefined;

  const { data: contratos = [], isLoading } = useQuery({
    queryKey: qk.contratos(alunoId),
    queryFn: () => fetchContratos(alunoId),
    enabled: Boolean(alunoId),
  });

  const { data: historico = [] } = useQuery({
    queryKey: qk.historicoPlanos(alunoId),
    queryFn: () => fetchHistoricoPlanos(alunoId),
    enabled: Boolean(alunoId),
  });

  const { data: plano } = useQuery({
    queryKey: [...qk.planos, planoId],
    queryFn: () => fetchMeuPlano(planoId),
    enabled: Boolean(planoId),
  });

  const { data: planos = [] } = useQuery({ queryKey: qk.planos, queryFn: fetchPlanos });
  const nomePlano = (id?: string | null) => planos.find((p) => p.id === id)?.nome ?? "Sem plano";

  const contrato = contratoAtual(contratos);
  const pendente = contratos.find((c) => c.status === "aguardando_pagamento");
  const status = statusContrato(contrato);
  const planoAtivo = Boolean(plano?.ativo && contrato &&
    (status === "ativo" || status === "proximo_vencimento") &&
    contrato.proximo_vencimento && contrato.proximo_vencimento >= todayISO());

  return (
    <div className="space-y-6">
      <PageTitle eyebrow="Financeiro" title="Meu plano" />

      <section className="surface-panel px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow">Plano atual</p>
            <p className="font-display text-2xl text-gold-gradient">
              {planoAtivo ? plano?.nome : "Sem plano ativo"}
            </p>
          </div>
           {planoAtivo && status && (
            <span
              className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold ${statusTone[status]}`}
            >
              {statusLabel[status]}
            </span>
          )}
        </div>
        {pendente && (
          <div className="mt-4 border-t border-border pt-3 text-sm" aria-live="polite">
            <p className="font-semibold text-primary">{nomePlano(pendente.plano_id)} · {precoBRL(pendente.valor_centavos)}</p>
            <p className="text-foreground">Status: Aguardando pagamento</p>
            <p className="mt-1 text-muted-foreground">Para liberar totalmente o seu plano, por gentileza faça primeiro o pagamento. Procure a administração do Wine Barbell Club.</p>
          </div>
        )}

        {!planoAtivo ? (
          <div className="mt-3">
            <p className="text-sm text-muted-foreground">
              Você ainda não tem um plano ativo — 0 aulas disponíveis.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {!pendente && <Link
                to="/planos"
                className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
              >
                Escolher plano
              </Link>}
              <Link
                to="/planos"
                className="rounded-md border border-border px-3 py-2 text-xs font-semibold text-foreground"
              >
                Comprar Day Use
              </Link>
            </div>
          </div>
        ) : (
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Início da vigência</dt>
              <dd className="text-foreground">{formatDateBR(contrato?.data_inicio) || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Fim da vigência</dt>
              <dd className="text-foreground">{formatDateBR(contrato?.data_fim) || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Próximo vencimento</dt>
              <dd className="text-foreground">
                {formatDateBR(contrato?.proximo_vencimento) || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Valor</dt>
              <dd className="text-foreground">
                {precoBRL(contrato?.valor_centavos ?? plano?.preco_centavos)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Limite de aulas</dt>
              <dd className="text-foreground">
                {plano?.acesso_livre
                  ? "Acesso livre"
                  : plano?.limite_semanal
                    ? `${plano.limite_semanal}/semana${plano.limite_mensal ? ` · ${plano.limite_mensal}/mês` : ""}`
                    : plano?.ilimitado
                      ? "Ilimitado"
                      : "0 aulas"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Forma de pagamento</dt>
              <dd className="text-foreground">{plano?.forma_pagamento ?? "—"}</dd>
            </div>
          </dl>
        )}

        {planoAtivo && contrato?.observacao && (
          <p className="mt-3 text-xs text-muted-foreground">{contrato.observacao}</p>
        )}
      </section>

      {plano?.beneficios && (
        <section>
          <p className="eyebrow mb-2">Benefícios do plano</p>
          <ul className="surface-panel space-y-1 px-5 py-4 text-sm text-muted-foreground">
            {itensPlano(plano.beneficios).map((b) => (
                <li key={b} className="flex items-center gap-2">
                  <Check className="size-3.5 text-primary" />
                  {b}
                </li>
              ))}
          </ul>
        </section>
      )}

      <section>
        <p className="eyebrow mb-2">Histórico de planos</p>
        {isLoading ? (
          <EmptyState>Carregando…</EmptyState>
        ) : historico.length === 0 ? (
          <EmptyState>Nenhuma alteração de plano registrada.</EmptyState>
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
                {h.observacao && (
                  <p className="mt-1 text-xs text-muted-foreground">{h.observacao}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <p className="text-sm text-muted-foreground">
        Quer mudar de plano?{" "}
        <Link to="/planos" className="font-semibold text-primary">
          Ver opções
        </Link>
      </p>
    </div>
  );
}
