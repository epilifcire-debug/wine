export const NASCIMENTO_MASCARADO = "00/00/*****";

export function maskNascimento(data?: string | null) {
  if (!data) return "—";
  return NASCIMENTO_MASCARADO;
}

export function formatDateBR(value?: string | null) {
  if (!value) return "—";
  const [y, m, d] = value.slice(0, 10).split("-");
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

export function formatDateLong(value?: string | null) {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return date.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

export function formatHora(value?: string | null) {
  if (!value) return "—";
  return value.slice(0, 5);
}

/** Data de hoje (AAAA-MM-DD) sempre no fuso de Brasília, no navegador ou no servidor. */
export function todayISO() {
  return dataISOBrasilia(new Date());
}

/** Data (AAAA-MM-DD) de um instante no fuso de Brasília. */
export function dataISOBrasilia(instante: Date) {
  // en-CA formata como AAAA-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instante);
}

/** AAAA-MM-DD a partir dos campos locais de uma data (sem passar por UTC). */
export function isoLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function youtubeEmbed(url?: string | null) {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/,
  );
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

export function saudacao(date = new Date()) {
  const min = date.getHours() * 60 + date.getMinutes();
  if (min >= 240 && min <= 720) return "Bom dia"; // 04:00 – 12:00
  if (min > 720 && min <= 1080) return "Boa tarde"; // 12:01 – 18:00
  if (min > 1080) return "Boa noite"; // 18:01 – 23:59
  if (min === 0) return "Boa noite"; // 00:00
  return "Isso é hora?"; // 00:01 – 03:59
}


export function firstName(nome?: string | null) {
  if (!nome) return "Atleta";
  return nome.trim().split(" ")[0];
}

export type Genero = "masculino" | "feminino" | "neutro";

export const GENEROS: { value: Genero; label: string }[] = [
  { value: "masculino", label: "Masculino" },
  { value: "feminino", label: "Feminino" },
  { value: "neutro", label: "Neutro" },
];

/** Forma de tratamento visual dentro do app (apenas a palavra). */
export function tratamentoAluno(genero?: string | null) {
  if (genero === "feminino") return "Aluna";
  if (genero === "neutro") return "Alunxs";
  return "Aluno";
}

/** Máscara (99)99999-9999 aplicada sobre dígitos. */
export function maskTelefone(value?: string | null) {
  const d = (value ?? "").replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)})${d.slice(2)}`;
  return `(${d.slice(0, 2)})${d.slice(2, 7)}-${d.slice(7)}`;
}

/** DDDs válidos no Brasil. */
export const DDDS_VALIDOS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43,
  44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77,
  79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

/** Mensagem de erro do telefone, ou null quando válido/vazio. */
export function erroTelefone(value?: string | null): string | null {
  const d = (value ?? "").replace(/\D/g, "");
  if (d.length === 0) return null;
  if (d.length < 11) return "Telefone incompleto: informe DDD + 9 dígitos.";
  if (!DDDS_VALIDOS.has(Number(d.slice(0, 2)))) return "DDD inválido. Verifique os 2 primeiros dígitos.";
  if (d[2] !== "9") return "Celular deve começar com 9 após o DDD.";
  return null;
}

export function telefoneValido(value?: string | null) {
  const d = (value ?? "").replace(/\D/g, "");
  return d.length === 11 && erroTelefone(value) === null;
}

