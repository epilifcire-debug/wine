function pad(n: number) {
  return String(n).padStart(2, "0");
}

function stamp(date: string, hora: string, addMinutes = 0) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = (hora ?? "00:00").split(":").map(Number);
  const dt = new Date(y!, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0);
  dt.setMinutes(dt.getMinutes() + addMinutes);
  return `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
}

/** Monta o link de criação de evento no Google Agenda para uma aula. */
export function googleCalendarUrl(opts: {
  titulo: string;
  data: string;
  horario: string;
  duracaoMin?: number;
  detalhes?: string;
  local?: string;
}) {
  const inicio = stamp(opts.data, opts.horario);
  const fim = stamp(opts.data, opts.horario, opts.duracaoMin ?? 60);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.titulo,
    dates: `${inicio}/${fim}`,
  });
  if (opts.detalhes) params.set("details", opts.detalhes);
  if (opts.local) params.set("location", opts.local);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
