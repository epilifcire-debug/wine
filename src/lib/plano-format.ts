import type { Plano } from "@/lib/queries";

export function itensPlano(value?: string | null) {
  if (!value) return [];

  const itens = value
    .replace(/\\r\\n|\\n|\\r/g, "\n")
    .split(/[;\r\n]+/)
    .map((item) => item.replace(/^\s*[•*–—-]+\s*/, "").trim())
    .filter(Boolean);

  return [...new Set(itens)];
}

export function recorrenciaPlano(plano: Plano) {
  return plano.tipo === "avulso" ? "Avulso" : "Recorrente";
}

export function duracaoPlano(plano: Plano) {
  if (plano.tipo === "avulso" || plano.duracao_meses <= 0) return "Acesso avulso";
  return `${plano.duracao_meses} ${plano.duracao_meses === 1 ? "mês" : "meses"}`;
}

export function quantidadeAulasPlano(plano: Plano) {
  if (plano.tipo === "avulso") return "1 aula";
  if (plano.limite_mensal) {
    return `${plano.limite_mensal} ${plano.limite_mensal === 1 ? "aula" : "aulas"} por mês`;
  }
  if (plano.ilimitado || plano.acesso_livre) return "Ilimitada";
  return "Conforme o limite semanal";
}

export function limiteSemanalPlano(plano: Plano) {
  if (plano.tipo === "avulso") return "Não se aplica";
  if (plano.ilimitado || plano.acesso_livre) return "Ilimitado";
  if (!plano.limite_semanal) return "Não definido";
  return `${plano.limite_semanal} ${plano.limite_semanal === 1 ? "aula" : "aulas"} por semana`;
}