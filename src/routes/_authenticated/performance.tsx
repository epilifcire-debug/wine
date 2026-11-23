import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, TrendingUp, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fetchPerformances, qk, type Performance } from "@/lib/queries";
import { EmptyState, PageTitle } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/performance")({
  component: PerformancePage,
  head: () => ({
    meta: [
      { title: "Performance — Wine Barbell Club" },
      { name: "description", content: "Registre suas marcas e acompanhe sua evolução por exercício." },
      { property: "og:title", content: "Performance — Wine Barbell Club" },
      { property: "og:description", content: "Histórico de cargas e evolução nos treinos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Periodo = "30d" | "3m" | "6m" | "1a" | "tudo";

const periodos: { id: Periodo; label: string; dias: number | null }[] = [
  { id: "30d", label: "30 dias", dias: 30 },
  { id: "3m", label: "3 meses", dias: 92 },
  { id: "6m", label: "6 meses", dias: 183 },
  { id: "1a", label: "1 ano", dias: 366 },
  { id: "tudo", label: "Completo", dias: null },
];

type FormState = {
  exercicio: string;
  carga_kg: string;
  repeticoes: string;
  tempo: string;
  distancia: string;
  resultado: string;
  data: string;
  observacao: string;
};

const formVazio = (): FormState => ({
  exercicio: "",
  carga_kg: "",
  repeticoes: "",
  tempo: "",
  distancia: "",
  resultado: "",
  data: new Date().toISOString().slice(0, 10),
  observacao: "",
});

function fmtData(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function resumo(p: Performance) {
  const partes: string[] = [];
  if (p.carga_kg != null) partes.push(`${p.carga_kg} kg`);
  if (p.repeticoes != null) partes.push(`${p.repeticoes} reps`);
  if (p.tempo) partes.push(p.tempo);
  if (p.distancia) partes.push(p.distancia);
  if (p.resultado) partes.push(p.resultado);
  return partes.join(" · ") || "—";
}

/** Gráfico de linha simples (SVG) da evolução de carga. */
function Grafico({ pontos }: { pontos: { data: string; valor: number }[] }) {
  if (pontos.length === 0) return null;
  const W = 600;
  const H = 180;
  const pad = 28;
  const valores = pontos.map((p) => p.valor);
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const span = max - min || 1;
  const x = (i: number) =>
    pontos.length === 1 ? W / 2 : pad + (i / (pontos.length - 1)) * (W - pad * 2);
  const y = (v: number) => H - pad - ((v - min) / span) * (H - pad * 2);
  const path = pontos.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.valor)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-44 w-full" role="img" aria-label="Gráfico de evolução">
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} className="stroke-border" strokeWidth="1" />
      <text x={pad} y={y(max) - 8} className="fill-muted-foreground" fontSize="11">
        {max} kg
      </text>
      {min !== max && (
        <text x={pad} y={y(min) + 16} className="fill-muted-foreground" fontSize="11">
          {min} kg
        </text>
      )}
      <path d={path} fill="none" className="stroke-primary" strokeWidth="2.5" strokeLinejoin="round" />
      {pontos.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.valor)} r="4" className="fill-primary" />
          <text
            x={x(i)}
            y={H - 8}
            textAnchor="middle"
            className="fill-muted-foreground"
            fontSize="10"
          >
            {p.data.slice(8, 10)}/{p.data.slice(5, 7)}
          </text>
        </g>
      ))}
    </svg>
  );
}

function PerformancePage() {
  const { aluno } = useAuth();
  const qc = useQueryClient();
  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando] = useState<Performance | null>(null);
  const [form, setForm] = useState<FormState>(formVazio());
  const [exercicioSel, setExercicioSel] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<Periodo>("tudo");
  const [excluindo, setExcluindo] = useState<Performance | null>(null);

  const { data: registros = [], isLoading } = useQuery({
    queryKey: [...qk.historicoPlanos(aluno?.id), "performances"],
    queryFn: () => fetchPerformances(aluno?.id),
    enabled: Boolean(aluno?.id),
  });

  const exercicios = useMemo(
    () => [...new Set(registros.map((r) => r.exercicio))].sort((a, b) => a.localeCompare(b)),
    [registros],
  );

  const selecionado = exercicioSel ?? exercicios[0] ?? null;

  const registrosExercicio = useMemo(() => {
    const cfg = periodos.find((p) => p.id === periodo)!;
    const corte = cfg.dias
      ? new Date(Date.now() - cfg.dias * 86_400_000).toISOString().slice(0, 10)
      : null;
    return registros
      .filter((r) => r.exercicio === selecionado && (!corte || r.data >= corte))
      .sort((a, b) => a.data.localeCompare(b.data));
  }, [registros, selecionado, periodo]);

  const comCarga = registrosExercicio.filter((r) => r.carga_kg != null);
  const melhor = comCarga.length ? Math.max(...comCarga.map((r) => r.carga_kg!)) : null;
  const ultima = comCarga.length ? comCarga[comCarga.length - 1].carga_kg! : null;

  const salvar = useMutation({
    mutationFn: async () => {
      if (!aluno?.id) throw new Error("Sem aluno");
      const payload = {
        aluno_id: aluno.id,
        exercicio: form.exercicio.trim(),
        carga_kg: form.carga_kg ? Number(form.carga_kg.replace(",", ".")) : null,
        repeticoes: form.repeticoes ? Number(form.repeticoes) : null,
        tempo: form.tempo.trim() || null,
        distancia: form.distancia.trim() || null,
        resultado: form.resultado.trim() || null,
        data: form.data,
        observacao: form.observacao.trim() || null,
      };
      if (!payload.exercicio) throw new Error("Informe o exercício");
      if (editando) {
        const { error } = await supabase.from("performances").update(payload).eq("id", editando.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("performances").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editando ? "Registro atualizado." : "Marca registrada.");
      setDialogAberto(false);
      setEditando(null);
      qc.invalidateQueries({ queryKey: [...qk.historicoPlanos(aluno?.id), "performances"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar."),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("performances").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registro excluído.");
      setExcluindo(null);
      qc.invalidateQueries({ queryKey: [...qk.historicoPlanos(aluno?.id), "performances"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao excluir."),
  });

  function abrirNovo() {
    setEditando(null);
    setForm(formVazio());
    setDialogAberto(true);
  }

  function abrirEdicao(p: Performance) {
    setEditando(p);
    setForm({
      exercicio: p.exercicio,
      carga_kg: p.carga_kg != null ? String(p.carga_kg) : "",
      repeticoes: p.repeticoes != null ? String(p.repeticoes) : "",
      tempo: p.tempo ?? "",
      distancia: p.distancia ?? "",
      resultado: p.resultado ?? "",
      data: p.data,
      observacao: p.observacao ?? "",
    });
    setDialogAberto(true);
  }

  return (
    <div>
      <PageTitle
        eyebrow="Evolução"
        title="Performance"
        action={
          <Button onClick={abrirNovo} size="sm" className="gap-1.5">
            <Plus className="size-4" /> Registrar marca
          </Button>
        }
      />

      {isLoading ? (
        <EmptyState>Carregando…</EmptyState>
      ) : registros.length === 0 ? (
        <EmptyState>
          <TrendingUp className="mx-auto mb-3 size-8 text-muted-foreground" />
          Nenhuma marca registrada ainda. Toque em "Registrar marca" para começar a acompanhar sua
          evolução.
        </EmptyState>
      ) : (
        <div className="space-y-5">
          {/* Seletor de exercício */}
          <div className="flex flex-wrap gap-2">
            {exercicios.map((ex) => (
              <button
                key={ex}
                onClick={() => setExercicioSel(ex)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium uppercase tracking-wide transition-colors",
                  selecionado === ex
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {ex}
              </button>
            ))}
          </div>

          {/* Filtros de período */}
          <div className="flex flex-wrap gap-1.5">
            {periodos.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriodo(p.id)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide transition-colors",
                  periodo === p.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Indicadores */}
          <div className="grid grid-cols-2 gap-3">
            <div className="surface-panel p-4">
              <p className="eyebrow flex items-center gap-1.5">
                <Trophy className="size-3.5" /> Melhor marca
              </p>
              <p className="font-display text-2xl text-foreground">
                {melhor != null ? `${melhor} kg` : "—"}
              </p>
            </div>
            <div className="surface-panel p-4">
              <p className="eyebrow">Última marca</p>
              <p className="font-display text-2xl text-foreground">
                {ultima != null ? `${ultima} kg` : "—"}
              </p>
            </div>
          </div>

          {/* Gráfico */}
          {comCarga.length > 0 && (
            <div className="surface-panel p-4">
              <p className="eyebrow mb-2">Evolução — {selecionado}</p>
              <Grafico
                pontos={comCarga.map((r) => ({ data: r.data, valor: r.carga_kg! }))}
              />
            </div>
          )}

          {/* Histórico */}
          <div className="space-y-2">
            <p className="eyebrow">Histórico — {selecionado}</p>
            {registrosExercicio.length === 0 ? (
              <EmptyState>Nenhum registro neste período.</EmptyState>
            ) : (
              [...registrosExercicio].reverse().map((p) => (
                <div key={p.id} className="surface-panel flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{resumo(p)}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmtData(p.data)}
                      {p.observacao ? ` · ${p.observacao}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => abrirEdicao(p)}
                    className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-primary"
                    aria-label="Editar registro"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    onClick={() => setExcluindo(p)}
                    className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-destructive"
                    aria-label="Excluir registro"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Dialog de registro/edição */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar marca" : "Registrar marca"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="exercicio">Exercício / movimento *</Label>
              <Input
                id="exercicio"
                list="exercicios-conhecidos"
                value={form.exercicio}
                onChange={(e) => setForm({ ...form, exercicio: e.target.value })}
                placeholder="Ex.: Back Squat, Snatch, Clean & Jerk"
              />
              <datalist id="exercicios-conhecidos">
                {exercicios.map((ex) => (
                  <option key={ex} value={ex} />
                ))}
              </datalist>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="carga">Carga (kg)</Label>
                <Input
                  id="carga"
                  inputMode="decimal"
                  value={form.carga_kg}
                  onChange={(e) => setForm({ ...form, carga_kg: e.target.value })}
                  placeholder="80"
                />
              </div>
              <div>
                <Label htmlFor="reps">Repetições</Label>
                <Input
                  id="reps"
                  inputMode="numeric"
                  value={form.repeticoes}
                  onChange={(e) => setForm({ ...form, repeticoes: e.target.value })}
                  placeholder="3"
                />
              </div>
              <div>
                <Label htmlFor="tempo">Tempo</Label>
                <Input
                  id="tempo"
                  value={form.tempo}
                  onChange={(e) => setForm({ ...form, tempo: e.target.value })}
                  placeholder="12:30"
                />
              </div>
              <div>
                <Label htmlFor="distancia">Distância</Label>
                <Input
                  id="distancia"
                  value={form.distancia}
                  onChange={(e) => setForm({ ...form, distancia: e.target.value })}
                  placeholder="5 km"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="resultado">Resultado</Label>
              <Input
                id="resultado"
                value={form.resultado}
                onChange={(e) => setForm({ ...form, resultado: e.target.value })}
                placeholder="Ex.: 45 reps no AMRAP"
              />
            </div>
            <div>
              <Label htmlFor="data">Data</Label>
              <Input
                id="data"
                type="date"
                value={form.data}
                onChange={(e) => setForm({ ...form, data: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="obs">Observação</Label>
              <Textarea
                id="obs"
                value={form.observacao}
                onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}>
              {salvar.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <AlertDialog open={Boolean(excluindo)} onOpenChange={() => setExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
            <AlertDialogDescription>
              A marca de {excluindo?.exercicio} de {excluindo ? fmtData(excluindo.data) : ""} será
              removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => excluindo && excluir.mutate(excluindo.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
