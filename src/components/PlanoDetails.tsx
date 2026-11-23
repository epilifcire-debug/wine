import { Check } from "lucide-react";
import { precoBRL, type Plano } from "@/lib/queries";
import {
  duracaoPlano,
  itensPlano,
  limiteSemanalPlano,
  quantidadeAulasPlano,
  recorrenciaPlano,
} from "@/lib/plano-format";

type PlanoDetailsProps = {
  plano: Plano;
  atual?: boolean;
  mostrarStatus?: boolean;
};

export function PlanoDetails({ plano, atual = false, mostrarStatus = false }: PlanoDetailsProps) {
  const beneficios = itensPlano(plano.beneficios);

  return (
    <div className="min-w-0">
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-display text-2xl text-foreground">{plano.nome}</h2>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          {atual && (
            <span className="rounded-md bg-primary/15 px-2 py-1 text-[11px] font-semibold text-primary">
              Seu plano
            </span>
          )}
          {mostrarStatus && !plano.ativo && (
            <span className="rounded-md border border-border px-2 py-1 text-[11px] font-semibold text-muted-foreground">
              Inativo
            </span>
          )}
        </div>
      </div>

      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">Recorrência</dt>
          <dd className="font-medium text-foreground">{recorrenciaPlano(plano)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Preço</dt>
          <dd className="font-display text-xl text-primary">{precoBRL(plano.preco_centavos)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Forma de pagamento</dt>
          <dd className="font-medium text-foreground">{plano.forma_pagamento || "Não informada"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Duração</dt>
          <dd className="font-medium text-foreground">{duracaoPlano(plano)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Quantidade de aulas</dt>
          <dd className="font-medium text-foreground">{quantidadeAulasPlano(plano)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Limite semanal</dt>
          <dd className="font-medium text-foreground">{limiteSemanalPlano(plano)}</dd>
        </div>
      </dl>

      {plano.regras_acesso && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Regras de acesso</p>
          <p className="mt-1 text-sm whitespace-pre-line text-foreground">
            {plano.regras_acesso.replace(/\\r\\n|\\n|\\r/g, "\n")}
          </p>
        </div>
      )}

      {beneficios.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Benefícios</p>
          <ul className="mt-2 space-y-1.5">
            {beneficios.map((beneficio) => (
              <li key={beneficio} className="flex items-start gap-2 text-sm text-foreground">
                <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <span>{beneficio}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {plano.descricao && (
        <p className="mt-4 border-t border-border pt-3 text-sm whitespace-pre-line text-muted-foreground">
          {plano.descricao.replace(/\\r\\n|\\n|\\r/g, "\n")}
        </p>
      )}
    </div>
  );
}