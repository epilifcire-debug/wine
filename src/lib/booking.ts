import { aulasNaSemana, type Plano } from "./queries";

export type BookingReason =
  | "NOT_AUTHENTICATED"
  | "NO_PLAN"
  | "PLAN_EXPIRED"
  | "WEEKLY_LIMIT_REACHED"
  | "DUPLICATE_BOOKING"
  | "CLASS_FULL"
  | "CLASS_CANCELLED";

export type BookingCheck = {
  allowed: boolean;
  reason?: BookingReason;
  limite?: number | null;
  usadas?: number;
  usaDayUse?: boolean;
};

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

/** Regra central: o aluno pode reservar uma aula? */
export function canBookClass(input: {
  aluno?: { id?: string | null; plano_id?: string | null } | null;
  plano?: Plano | null;
  /** Contrato pago e vigente; o cadastro do plano por si só não libera reservas. */
  contratoVigente?: boolean;
  reservas?: any[];
  base?: Date;
  /** Day Uses com status "disponivel". */
  dayUsesDisponiveis?: number;
  /** Aula alvo, para checar conflito, vagas e cancelamento. */
  horario?: {
    id?: string;
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

  // Sem limite semanal só significa "ilimitado" quando o plano marca isso.
  const limite = plano?.limite_semanal;
  if (limite == null) return { allowed: true, limite: null };

  const usadas = aulasNaSemana(confirmadas, base);
  if (usadas >= limite) {
    if (dayUsesDisponiveis > 0) {
      return { allowed: true, limite, usadas, usaDayUse: true };
    }
    return { allowed: false, reason: "WEEKLY_LIMIT_REACHED", limite, usadas };
  }
  return { allowed: true, limite, usadas };
}


/** Converte erros do banco (triggers) em motivos conhecidos. */
export function reasonFromError(message?: string | null): BookingReason | null {
  const msg = message ?? "";
  if (/PLAN_EXPIRED|vencido/i.test(msg)) return "PLAN_EXPIRED";
  if (/NO_ACTIVE_PLAN/i.test(msg)) return "NO_PLAN";
  if (/WEEKLY_PLAN_LIMIT_REACHED|limite semanal/i.test(msg)) return "WEEKLY_LIMIT_REACHED";
  return null;
}
