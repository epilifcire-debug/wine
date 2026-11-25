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

export const DIAS_SEMANA = [
  { value: "1", label: "Seg" },
  { value: "2", label: "Ter" },
  { value: "3", label: "Qua" },
  { value: "4", label: "Qui" },
  { value: "5", label: "Sex" },
  { value: "6", label: "Sáb" },
  { value: "7", label: "Dom" },
];

export function diasPlano(plano: Plano) {
  const dias = plano.dias_permitidos ?? [];
  if (dias.length === 0 || dias.length === 7) return "Todos os dias";
  const set = new Set(dias.map(Number));
  return DIAS_SEMANA.filter((d) => set.has(Number(d.value))).map((d) => d.label).join(", ");
}

export function diasAcessoLivrePlano(plano: Plano) {
  const dias = plano.dias_acesso_livre ?? [];
  if (dias.length === 0) return null;
  const set = new Set(dias.map(Number));
  return DIAS_SEMANA.filter((d) => set.has(Number(d.value))).map((d) => d.label).join(", ");
}

/** Dia de acesso livre (sem reserva) para o plano nesta data? */
export function ehDiaAcessoLivre(plano: Plano | null | undefined, dataISO: string) {
  if (!plano) return false;
  const dia = diaIsoSemana(dataISO);
  const livres = (plano.dias_acesso_livre ?? []).map(Number);
  const aulas = (plano.dias_permitidos ?? []).map(Number);
  return livres.includes(dia) && !aulas.includes(dia);
}

/** Dia ISO da semana de uma data AAAA-MM-DD (1 = segunda ... 7 = domingo). */
export function diaIsoSemana(dataISO: string) {
  const d = new Date(`${dataISO.slice(0, 10)}T12:00:00`).getDay();
  return d === 0 ? 7 : d;
}

export function quantidadeAulasPlano(plano: Plano) {
  if (plano.tipo === "avulso") return "1 aula";
  if (plano.limite_mensal) {
    return `${plano.limite_mensal} ${plano.limite_mensal === 1 ? "aula" : "aulas"} por mês`;
  }
  if (plano.ilimitado) return "Ilimitada";
  return "Conforme o limite semanal";
}

export function limiteSemanalPlano(plano: Plano) {
  if (plano.tipo === "avulso") return "Não se aplica";
  if (plano.ilimitado) return "Ilimitado";
  if (!plano.limite_semanal) return "Não definido";
  return `${plano.limite_semanal} ${plano.limite_semanal === 1 ? "aula" : "aulas"} por semana`;
}