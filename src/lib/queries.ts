import { supabase } from "@/integrations/supabase/client";
import { isoLocal, todayISO } from "./format";

export type Modalidade = {
  id: string;
  nome: string;
  descricao: string | null;
  o_que_e: string | null;
  como_funciona: string | null;
  beneficios: string | null;
  exercicios: string | null;
  video_youtube_url: string | null;
  galeria_imagens: string[];
  ativo: boolean;
};

export type Horario = {
  id: string;
  modalidade_id: string;
  instrutor: string;
  data: string;
  horario: string;
  limite_vagas: number;
  observacoes: string | null;
  cancelada: boolean;
  modalidades?: { nome: string } | null;
};

export type Treino = {
  id: string;
  modalidade_id: string;
  nome: string;
  data: string;
  objetivo: string | null;
  exercicios: string | null;
  series: string | null;
  repeticoes: string | null;
  tempo: string | null;
  observacoes: string | null;
  video_youtube_url: string | null;
  modalidades?: { nome: string } | null;
};

export type Plano = {
  id: string;
  nome: string;
  descricao: string | null;
  limite_semanal: number | null;
  limite_mensal: number | null;
  preco_centavos: number;
  forma_pagamento: string;
  duracao_meses: number;
  acesso_livre: boolean;
  ilimitado: boolean;
  beneficios: string | null;
  regras_acesso: string | null;
  tipo: string;
  ordem: number;
  ativo: boolean;
  /** Dias liberados, 1 = segunda ... 7 = domingo. Vazio/nulo = todos. */
  dias_permitidos?: number[] | null;
  /** Dias de acesso livre ao espaço, sem reserva de aula (ex.: sábado do Flagship). */
  dias_acesso_livre?: number[] | null;
  /** Turmas (modalidades) liberadas. Vazio/nulo = todas. */
  modalidades_permitidas?: string[] | null;
  /** Valor da renovação com desconto (só trimestrais). */
  preco_recorrencia_centavos?: number | null;
};

export const qk = {
  planos: ["planos"] as const,
  eventos: ["eventos"] as const,
  modalidades: ["modalidades"] as const,
  modalidade: (id: string) => ["modalidades", id] as const,
  horarios: ["horarios"] as const,
  reservas: ["reservas"] as const,
  treinos: ["treinos"] as const,
  alunos: ["alunos"] as const,
  notificacoes: ["notificacoes"] as const,
  historicoPlanos: (alunoId?: string) => ["plano_historico", alunoId] as const,
  contratos: (alunoId?: string) => ["aluno_planos", alunoId] as const,
  pagamentos: (alunoId?: string) => ["pagamentos", alunoId] as const,
};


export async function fetchModalidades() {
  const { data, error } = await supabase
    .from("modalidades")
    .select("*")
    .order("nome", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Modalidade[];
}

export async function fetchHorarios(fromToday = true) {
  let query = supabase
    .from("horarios")
    .select("*, modalidades(nome)")
    .order("data", { ascending: true })
    .order("horario", { ascending: true });
  if (fromToday) query = query.gte("data", todayISO());
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Horario[];
}

export async function fetchOcupacao() {
  const { data, error } = await supabase
    .from("reservas")
    .select("horario_id, status")
    .eq("status", "confirmada");
  if (error) throw error;
  const map = new Map<string, number>();
  for (const row of data ?? []) {
    map.set(row.horario_id, (map.get(row.horario_id) ?? 0) + 1);
  }
  return map;
}

export async function fetchMinhasReservas(alunoId?: string) {
  if (!alunoId) return [];
  const { data, error } = await supabase
    .from("reservas")
    .select("*, horarios(*, modalidades(nome)), day_uses(id)")
    .eq("aluno_id", alunoId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchTreinos() {
  const { data, error } = await supabase
    .from("treinos")
    .select("*, modalidades(nome)")
    .order("data", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Treino[];
}


export async function fetchNotificacoes() {
  const { data, error } = await supabase
    .from("notificacoes")
    .select("*")
    .order("data_envio", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchAdminUserIds() {
  const { data, error } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.user_id));
}

/**
 * Alunos = fichas de contas cujo papel é "aluno" (com ou sem plano), mais as
 * fichas ainda sem conta vinculada. Contas administrativas ou de professor
 * (que não sejam também alunos) ficam de fora. Nunca há JOIN obrigatório com
 * planos/contratos: quem não tem plano continua aparecendo.
 */
export async function fetchAlunos() {
  const [{ data, error }, { data: roles, error: rolesErr }] = await Promise.all([
    supabase.from("alunos").select("*").order("nome", { ascending: true }),
    supabase.from("user_roles").select("user_id, role"),
  ]);
  if (error) throw error;
  if (rolesErr) throw rolesErr;

  const papeis = new Map<string, Set<string>>();
  for (const r of roles ?? []) {
    const set = papeis.get(r.user_id) ?? new Set<string>();
    set.add(String(r.role));
    papeis.set(r.user_id, set);
  }

  return (data ?? []).filter((a: any) => {
    if (!a.user_id) return true;
    const rs = papeis.get(a.user_id);
    if (!rs || rs.size === 0) return true;
    // Admin e professor nunca contam como aluno, mesmo que também tenham o papel "aluno".
    if (rs.has("admin") || rs.has("admin_master") || rs.has("professor")) return false;
    if (rs.has("aluno")) return true;
    return !rs.has("admin") && !rs.has("professor") && !rs.has("admin_master");
  });
}

export async function fetchReservasDetalhadas() {
  const { data, error } = await supabase
    .from("reservas")
    .select("id, status, horario_id, alunos(id, nome, telefone, email, genero)")
    .eq("status", "confirmada");
  if (error) throw error;
  return (data ?? []) as any[];
}


export async function signedAvatar(path?: string | null) {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

/* ───────────── Etapa 1: check-in, presença e área do professor ───────────── */

export type Presenca = "pendente" | "presente" | "falta";

/** Aulas em que o usuário é o professor responsável. */
export async function fetchAulasProfessor(userId?: string) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("horarios")
    .select("*, modalidades(nome)")
    .eq("professor_user_id", userId)
    .order("data", { ascending: true })
    .order("horario", { ascending: true });
  if (error) throw error;
  return (data ?? []) as any[];
}

/** Reservas de uma aula, com dados básicos do aluno. */
export async function fetchReservasDaAula(horarioId: string) {
  const { data, error } = await supabase
    .from("reservas")
    .select("id, status, checkin_em, presenca, alunos(id, nome, genero, telefone)")
    .eq("horario_id", horarioId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as any[];
}

export async function marcarPresenca(reservaId: string, presenca: Presenca) {
  const { error } = await supabase
    .from("reservas")
    .update({
      presenca,
      presenca_em: new Date().toISOString(),
    } as never)
    .eq("id", reservaId);
  if (error) throw error;
}

export async function fazerCheckin(reservaId: string) {
  const { error } = await supabase
    .from("reservas")
    .update({ checkin_em: new Date().toISOString() } as never)
    .eq("id", reservaId)
    .eq("status", "confirmada");
  if (error) throw error;
}

/** Data/hora de início da aula como Date local. */
export function inicioAula(data: string, horario: string) {
  return new Date(`${data.slice(0, 10)}T${horario.slice(0, 8)}`);
}

/** Check-in liberado de 3h antes até 1h depois do início. */
export function janelaCheckin(data: string, horario: string, agora = new Date()) {
  const inicio = inicioAula(data, horario).getTime();
  const ms = agora.getTime();
  if (ms < inicio - 3 * 3600_000) return "cedo" as const;
  if (ms > inicio + 3600_000) return "encerrada" as const;
  return "aberta" as const;
}

/* ───────────── Etapa 2: planos comerciais e limite semanal ───────────── */

export async function fetchPlanos() {
  const { data, error } = await supabase
    .from("planos")
    .select("*")
    .order("ordem", { ascending: true })
    .order("nome", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Plano[];
}

/** Plano vinculado ao aluno (ou null). */
export async function fetchMeuPlano(planoId?: string | null) {
  if (!planoId) return null;
  const { data, error } = await supabase.from("planos").select("*").eq("id", planoId).maybeSingle();
  if (error) throw error;
  return (data ?? null) as Plano | null;
}

/** Segunda-feira da semana da data informada, em ISO (yyyy-mm-dd). */
export function inicioSemanaISO(base = new Date()) {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const dow = (d.getDay() + 6) % 7; // 0 = segunda
  d.setDate(d.getDate() - dow);
  return isoLocal(d);
}

/** Quantas aulas confirmadas o aluno tem na semana corrente. */
/** Aulas do plano no mês da data base (Day Use não conta). */
export function aulasNoMes(reservas: any[], base = new Date()) {
  const mes = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}`;
  return (reservas ?? []).filter(
    (r) =>
      r.status === "confirmada" &&
      !(Array.isArray(r.day_uses) && r.day_uses.length > 0) &&
      r.horarios &&
      !r.horarios.cancelada &&
      String(r.horarios.data).slice(0, 7) === mes,
  ).length;
}

export function aulasNaSemana(reservas: any[], base = new Date()) {
  const ini = inicioSemanaISO(base);
  const fimDate = new Date(`${ini}T00:00:00`);
  fimDate.setDate(fimDate.getDate() + 7);
  const fim = isoLocal(fimDate);
  return (reservas ?? []).filter(
    (r) =>
      r.status === "confirmada" &&
      !(Array.isArray(r.day_uses) && r.day_uses.length > 0) &&
      r.horarios &&
      !r.horarios.cancelada &&
      r.horarios.data >= ini &&
      r.horarios.data < fim,
  ).length;
}

export function precoBRL(centavos?: number | null) {
  return ((centavos ?? 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/* ───────────── Etapa 6/7: histórico de planos e financeiro ───────────── */

export type PlanoEvento =
  | "contratacao"
  | "renovacao"
  | "upgrade"
  | "downgrade"
  | "cancelamento"
  | "reativacao";

export type ContratoStatus = "ativo" | "proximo_vencimento" | "vencido" | "cancelado" | "aguardando_pagamento";

export type Contrato = {
  id: string;
  aluno_id: string;
  plano_id: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  proximo_vencimento: string | null;
  valor_centavos: number;
  status: ContratoStatus;
  observacao: string | null;
  created_at: string;
  planos?: { nome: string } | null;
  /** Aluno pediu para deixar recorrente no cartão. */
  recorrencia_solicitada?: boolean;
  /** Admin ativou a chave da recorrência. */
  recorrencia_ativa?: boolean;
  recorrencia_ativada_em?: string | null;
};

/** Sinalizador de recorrência do contrato, ou null se não houver. */
export function situacaoRecorrencia(c?: Pick<Contrato, "recorrencia_solicitada" | "recorrencia_ativa"> | null) {
  if (!c) return null;
  if (c.recorrencia_ativa) return { ativa: true, label: "Recorrente no cartão" } as const;
  if (c.recorrencia_solicitada) return { ativa: false, label: "Recorrência aguardando ativação" } as const;
  return null;
}

export const eventoLabel: Record<PlanoEvento, string> = {
  contratacao: "Contratação",
  renovacao: "Renovação",
  upgrade: "Upgrade",
  downgrade: "Downgrade",
  cancelamento: "Cancelamento",
  reativacao: "Reativação",
};

export const statusLabel: Record<ContratoStatus, string> = {
  ativo: "Ativo",
  proximo_vencimento: "Próximo do vencimento",
  vencido: "Vencido",
  cancelado: "Cancelado",
  aguardando_pagamento: "Aguardando pagamento",
};

/** Status efetivo do contrato considerando as datas (o cancelamento sempre prevalece). */
export function statusContrato(c?: Contrato | null, hoje = new Date()): ContratoStatus | null {
  if (!c) return null;
  if (c.status === "aguardando_pagamento") return "aguardando_pagamento";
  if (c.status === "cancelado") return "cancelado";
  const ref = c.proximo_vencimento ?? c.data_fim;
  if (!ref) return "ativo";
  const alvo = new Date(`${ref}T00:00:00`).getTime();
  const dias = Math.ceil((alvo - hoje.getTime()) / 86_400_000);
  if (dias < 0) return "vencido";
  if (dias <= 7) return "proximo_vencimento";
  return "ativo";
}

export async function fetchHistoricoPlanos(alunoId?: string) {
  if (!alunoId) return [];
  const { data, error } = await supabase
    .from("plano_historico")
    .select("*")
    .eq("aluno_id", alunoId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as any[];
}

export async function fetchContratos(alunoId?: string) {
  if (!alunoId) return [];
  const { data, error } = await supabase
    .from("aluno_planos")
    .select("*, planos(nome)")
    .eq("aluno_id", alunoId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Contrato[];
}

/** Todos os contratos (uso administrativo), para calcular situação por aluno. */
export async function fetchTodosContratos() {
  const { data, error } = await supabase
    .from("aluno_planos")
    .select("*, planos(nome)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Contrato[];
}

/** Mapa aluno_id → contrato vigente. */
export function mapaContratos(contratos: Contrato[]) {
  const map = new Map<string, Contrato>();
  for (const c of contratos) {
    if (!map.has(c.aluno_id) && c.status !== "cancelado" && c.status !== "aguardando_pagamento") map.set(c.aluno_id, c);
  }
  return map;
}


/** Contrato vigente (o mais recente não cancelado). */
export function contratoAtual(contratos: Contrato[]) {
  return contratos.find((c) => c.status !== "cancelado" && c.status !== "aguardando_pagamento") ?? null;
}

export async function fetchPagamentos(alunoId?: string) {
  if (!alunoId) return [];
  const { data, error } = await supabase.from("pagamentos")
    .select("id, aluno_id, plano_id, aluno_plano_id, valor_centavos, forma_pagamento, status, pago_em, registrado_por, created_at")
    .eq("aluno_id", alunoId).order("pago_em", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/* ───────────── Etapa 8: performance do aluno ───────────── */

export type Performance = {
  id: string;
  aluno_id: string;
  exercicio: string;
  carga_kg: number | null;
  repeticoes: number | null;
  tempo: string | null;
  distancia: string | null;
  resultado: string | null;
  data: string;
  observacao: string | null;
  created_at: string;
};

export async function fetchPerformances(alunoId?: string) {
  if (!alunoId) return [];
  const { data, error } = await supabase
    .from("performances")
    .select("*")
    .eq("aluno_id", alunoId)
    .order("data", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Performance[];
}

/* ───────────── Etapa 9: eventos ───────────── */

export type Evento = {
  id: string;
  titulo: string;
  descricao: string | null;
  informacoes: string | null;
  imagem_url: string | null;
  data: string;
  horario: string | null;
  local: string | null;
  publicado: boolean;
  created_at: string;
};

/** Eventos visíveis: alunos recebem apenas os publicados (regra aplicada no banco). */
export async function fetchEventos() {
  const { data, error } = await supabase
    .from("eventos")
    .select("*")
    .order("data", { ascending: false })
    .order("horario", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Evento[];
}

/* ───────────── Etapa 10: lista de espera ───────────── */

export type EsperaStatus =
  | "aguardando"
  | "oportunidade_disponivel"
  | "aceito"
  | "expirado"
  | "removido"
  | "cancelado";

export type ListaEspera = {
  id: string;
  horario_id: string;
  aluno_id: string;
  status: EsperaStatus;
  oportunidade_em: string | null;
  oportunidade_expira_em: string | null;
  created_at: string;
};

/** Posições ativas do aluno na lista de espera, por aula. */
export async function fetchMinhaListaEspera(alunoId?: string) {
  if (!alunoId) return [];
  const { data, error } = await supabase
    .from("lista_espera")
    .select("*")
    .eq("aluno_id", alunoId)
    .in("status", ["aguardando", "oportunidade_disponivel"])
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ListaEspera[];
}

export type DemandaListaEspera = ListaEspera & {
  horarios: {
    horario: string;
    modalidades: { nome: string } | null;
  } | null;
};

/** Demanda da fila usada pelos indicadores administrativos. */
export async function fetchDemandaListaEspera(desdeISO?: string) {
  let query = supabase
    .from("lista_espera")
    .select("id, horario_id, aluno_id, status, oportunidade_em, oportunidade_expira_em, created_at, horarios!inner(horario, modalidades(nome))")
    .not("status", "in", '("removido","cancelado")')
    .order("created_at", { ascending: false })
    .limit(2000);
  if (desdeISO) query = query.gte("created_at", `${desdeISO}T00:00:00.000Z`);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as DemandaListaEspera[];
}

/* ───────────── Parte 8: indicadores administrativos ───────────── */

export type ReservaAssiduidade = {
  id: string;
  status: string;
  presenca: string;
  checkin_em: string | null;
  aluno_id: string;
  horario_id: string;
  horarios: {
    data: string;
    horario: string;
    limite_vagas: number;
    cancelada: boolean;
    modalidades: { nome: string } | null;
  } | null;
};

/** Reservas com dados da aula para calcular frequência, faltas e ocupação. */
export async function fetchAssiduidade(desdeISO?: string) {
  let query = supabase
    .from("reservas")
    .select(
      "id, status, presenca, checkin_em, aluno_id, horario_id, horarios!inner(data, horario, limite_vagas, cancelada, modalidades(nome))",
    )
    .order("created_at", { ascending: false })
    .limit(2000);
  if (desdeISO) query = query.gte("horarios.data", desdeISO);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as ReservaAssiduidade[];
}

export function diasAtrasISO(dias: number, base = new Date()) {
  const d = new Date(base);
  d.setDate(d.getDate() - dias);
  return isoLocal(d);
}
