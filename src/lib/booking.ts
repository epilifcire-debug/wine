import { aulasNaSemana, aulasNoMes, type Plano } from "./queries";
import { diaIsoSemana, diasPlano, ehDiaAcessoLivre } from "./plano-format";
import { formatDateBR } from "./format";

export type BookingReason =
  | "NOT_AUTHENTICATED"
  | "NO_PLAN"
  | "PLAN_EXPIRED"
  | "WEEKLY_LIMIT_REACHED"
  | "MONTHLY_LIMIT_REACHED"
  | "DAY_NOT_ALLOWED"
  | "FREE_ACCESS_DAY"
  | "CLASS_NOT_ALLOWED"
  | "DUPLICATE_BOOKING"
  | "CLASS_FULL"
  | "CLASS_CANCELLED"
  | "CLASS_ALREADY_STARTED"
  | "CANCEL_NOT_ALLOWED";

export type BookingCheck = {
  allowed: boolean;
  reason?: BookingReason;
  limite?: number | null;
  usadas?: number;
  usaDayUse?: boolean;
};

export const MSG_CLASS_ALREADY_STARTED = "Esta aula já começou ou já passou. Escolha outro horário.";

export const MSG_CANCEL_NOT_ALLOWED =
  "Esta aula não pode mais ser cancelada: ela já começou ou já tem presença registrada.";

export function msgPlanoVenceAntes(vencimento?: string | null) {
  return vencimento
    ? `Seu plano vence em ${formatDateBR(vencimento)}, antes da data desta aula. Renove seu plano para reservar.`
    : "Seu plano vence antes da data desta aula. Renove seu plano para reservar.";
}

export const MSG_NO_PLAN =
  "Você ainda não possui um plano ativo. Escolha um plano para poder reservar suas aulas.";

export const MSG_PLAN_EXPIRED =
  "Seu plano está vencido. Renove seu plano para voltar a reservar aulas.";

export const MSG_BEM_VINDO =
  "Bem-vindo ao Wine Barbell Club! Escolha seu plano para começar a reservar seus treinos.";

export const MSG_DUPLICATE_BOOKING =
  "Você já tem uma reserva confirmada neste mesmo dia e horário.";

export const MSG_CLASS_FULL = "Esta turma já está lotada. Escolha outro horário.";

export const MSG_CLASS_CANCELLED = "Esta aula foi cancelada pelo estúdio.";

export function msgLimiteSemanal(limite?: number | null) {
  if (!limite) {
    return "Seu plano não permite mais aulas nesta semana. Para realizar mais aulas, faça upgrade do seu plano ou use um Day Use.";
  }
  return `Seu plano permite até ${limite} aula${limite === 1 ? "" : "s"} por semana. Para realizar mais aulas, faça upgrade do seu plano ou use um Day Use.`;
}

export function msgLimiteMensal(limite?: number | null) {
  if (!limite) {
    return "Seu plano não permite mais aulas neste mês. Para realizar mais aulas, faça upgrade do seu plano ou use um Day Use.";
  }
  return `Seu plano permite até ${limite} aula${limite === 1 ? "" : "s"} por mês. Para realizar mais aulas, faça upgrade do seu plano ou use um Day Use.`;
}

export function msgDiaNaoPermitido(plano?: Plano | null) {
  const dias = plano ? diasPlano(plano) : "";
  return `Seu plano não libera aulas neste dia${dias ? ` (dias liberados: ${dias})` : ""}. Escolha outra data, faça upgrade do seu plano ou use um Day Use.`;
}

export const MSG_ACESSO_LIVRE =
  "Neste dia seu plano tem acesso livre ao studio para treino de força, sem reserva de aula. É só chegar e treinar.";

export const MSG_TURMA_NAO_PERMITIDA =
  "Seu plano não libera esta turma. Escolha uma turma incluída no seu plano, faça upgrade ou use um Day Use.";

/** Regra central: o aluno pode reservar uma aula? */
export function canBookClass(input: {
  aluno?: { id?: string | null; plano_id?: string | null } | null;
  plano?: Plano | null;
  /** Contrato pago e vigente; o cadastro do plano por si só não libera reservas. */
  contratoVigente?: boolean;
  /** Vencimento do contrato (AAAA-MM-DD): a aula precisa ser até essa data. */
  vencimento?: string | null;
  reservas?: any[];
  base?: Date;
  /** Day Uses com status "disponivel". */
  dayUsesDisponiveis?: number;
  /** Aula alvo, para checar conflito, vagas e cancelamento. */
  horario?: {
    id?: string;
    modalidade_id?: string;
    data?: string;
    horario?: string;
    cancelada?: boolean | null;
    limite_vagas?: number;
  } | null;
  /** Reservas confirmadas já existentes na aula alvo. */
  ocupadas?: number;
}): BookingCheck {
  const {
    aluno,
    plano,
    contratoVigente = false,
    vencimento = null,
    reservas = [],
    base = new Date(),
    dayUsesDisponiveis = 0,
    horario,
    ocupadas,
  } = input;

  if (!aluno?.id) return { allowed: false, reason: "NOT_AUTHENTICATED" };

  const confirmadas = (reservas as any[]).filter((r) => r.status === "confirmada");

  if (horario) {
    if (horario.cancelada) return { allowed: false, reason: "CLASS_CANCELLED" };

    // Aula que já começou (horário de Brasília).
    if (horario.data && horario.horario) {
      const inicio = new Date(`${horario.data.slice(0, 10)}T${horario.horario.slice(0, 5)}:00-03:00`);
      if (!Number.isNaN(inicio.getTime()) && inicio.getTime() <= base.getTime()) {
        return { allowed: false, reason: "CLASS_ALREADY_STARTED" };
      }
    }

    const jaReservada = confirmadas.some(
      (r) =>
        r.horario_id === horario.id ||
        (r.horarios &&
          r.horarios.data === horario.data &&
          r.horarios.horario === horario.horario &&
          !r.horarios.cancelada),
    );
    if (jaReservada) return { allowed: false, reason: "DUPLICATE_BOOKING" };

    if (
      typeof horario.limite_vagas === "number" &&
      typeof ocupadas === "number" &&
      ocupadas >= horario.limite_vagas
    ) {
      return { allowed: false, reason: "CLASS_FULL" };
    }
  }

  const temPlano = Boolean(aluno.plano_id && plano && plano.ativo === true && contratoVigente);
  if (!temPlano) {
    // Sem plano ativo, um Day Use disponível ainda permite reservar.
    if (dayUsesDisponiveis > 0) return { allowed: true, usaDayUse: true };
    return { allowed: false, reason: "NO_PLAN" };
  }

  // Fora da regra do plano, um Day Use disponível ainda libera a aula.
  const bloqueio = (reason: BookingReason, extra: Partial<BookingCheck> = {}): BookingCheck =>
    dayUsesDisponiveis > 0
      ? { allowed: true, usaDayUse: true, ...extra }
      : { allowed: false, reason, ...extra };

  const dataAula = horario?.data;
  // A validade vale para a data da aula, não para hoje.
  if (dataAula && vencimento && dataAula.slice(0, 10) > vencimento) return bloqueio("PLAN_EXPIRED");
  if (dataAula && ehDiaAcessoLivre(plano, dataAula)) return bloqueio("FREE_ACCESS_DAY");
  const dias = plano?.dias_permitidos ?? [];
  if (dataAula && dias.length > 0 && !dias.map(Number).includes(diaIsoSemana(dataAula))) {
    return bloqueio("DAY_NOT_ALLOWED");
  }
  const turmas = plano?.modalidades_permitidas ?? [];
  if (horario?.modalidade_id && turmas.length > 0 && !turmas.includes(horario.modalidade_id)) {
    return bloqueio("CLASS_NOT_ALLOWED");
  }

  if (plano?.ilimitado) return { allowed: true, limite: null };

  const baseAula = dataAula ? new Date(`${dataAula.slice(0, 10)}T12:00:00`) : base;
  const limite = plano?.limite_semanal ?? null;
  if (limite != null) {
    const usadas = aulasNaSemana(confirmadas, baseAula);
    if (usadas >= limite) return bloqueio("WEEKLY_LIMIT_REACHED", { limite, usadas });
  }
  const limiteMes = plano?.limite_mensal ?? null;
  if (limiteMes != null) {
    const usadasMes = aulasNoMes(confirmadas, baseAula);
    if (usadasMes >= limiteMes) {
      return bloqueio("MONTHLY_LIMIT_REACHED", { limite: limiteMes, usadas: usadasMes });
    }
  }
  return { allowed: true, limite };
}


/** Converte erros do banco (triggers) em motivos conhecidos. */
export function reasonFromError(message?: string | null): BookingReason | null {
  const msg = message ?? "";
  if (/PLAN_EXPIRED|PLAN_NOT_STARTED|vencido/i.test(msg)) return "PLAN_EXPIRED";
  if (/CLASS_ALREADY_STARTED/i.test(msg)) return "CLASS_ALREADY_STARTED";
  if (/CANCEL_NOT_ALLOWED/i.test(msg)) return "CANCEL_NOT_ALLOWED";
  if (/DUPLICATE_TIME_SLOT/i.test(msg)) return "DUPLICATE_BOOKING";
  if (/NO_ACTIVE_PLAN/i.test(msg)) return "NO_PLAN";
  if (/WEEKLY_PLAN_LIMIT_REACHED|limite semanal/i.test(msg)) return "WEEKLY_LIMIT_REACHED";
  if (/MONTHLY_PLAN_LIMIT_REACHED/i.test(msg)) return "MONTHLY_LIMIT_REACHED";
  if (/PLAN_FREE_ACCESS_DAY/i.test(msg)) return "FREE_ACCESS_DAY";
  if (/PLAN_DAY_NOT_ALLOWED/i.test(msg)) return "DAY_NOT_ALLOWED";
  if (/PLAN_CLASS_NOT_ALLOWED/i.test(msg)) return "CLASS_NOT_ALLOWED";
  return null;
}
