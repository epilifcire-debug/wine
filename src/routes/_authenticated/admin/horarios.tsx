import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchHorarios, fetchModalidades, fetchOcupacao, qk, type Horario } from "@/lib/queries";
import { formatDateLong, formatHora } from "@/lib/format";
import { AdminGuard } from "@/components/AdminGuard";
import { EmptyState, PageTitle } from "@/components/AppShell";
import { RecordDialog, type FieldSpec } from "@/components/RecordDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/admin/horarios")({
  component: () => (
    <AdminGuard>
      <AdminHorarios />
    </AdminGuard>
  ),
  head: () => ({
    meta: [
      { title: "Gestão de horários — Wine Barbell Club" },
      { name: "description", content: "Crie aulas com modalidade, instrutor, data, hora e vagas." },
      { property: "og:title", content: "Gestão de horários — Wine Barbell Club" },
      { property: "og:description", content: "CRUD das turmas e horários do estúdio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function AdminHorarios() {
  const qc = useQueryClient();
  const { data: modalidades = [] } = useQuery({
    queryKey: qk.modalidades,
    queryFn: fetchModalidades,
  });
  const { data: horarios = [], isLoading } = useQuery({
    queryKey: [...qk.horarios, "admin"],
    queryFn: () => fetchHorarios(false),
  });
  const { data: ocupacao } = useQuery({ queryKey: ["ocupacao"], queryFn: fetchOcupacao });

  const campos: FieldSpec[] = [
    {
      name: "modalidade_id",
      label: "Modalidade",
      type: "select",
      required: true,
      options: modalidades.map((m) => ({ value: m.id, label: m.nome })),
    },
    { name: "instrutor", label: "Instrutor (texto livre)", required: true, maxLength: 80 },
    { name: "data", label: "Data", type: "date", required: true },
    { name: "horario", label: "Horário", type: "time", required: true },
    { name: "limite_vagas", label: "Limite de vagas", type: "number", required: true },
    { name: "observacoes", label: "Observações", type: "textarea" },
  ];

  const salvar = useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: Record<string, any> }) => {
      const payload = { ...values, limite_vagas: Number(values.limite_vagas) || 1 };
      const { error } = id
        ? await supabase.from("horarios").update(payload as any).eq("id", id)
        : await supabase.from("horarios").insert(payload as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Horário salvo.");
      qc.invalidateQueries({ queryKey: qk.horarios });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("horarios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Horário removido.");
      qc.invalidateQueries({ queryKey: qk.horarios });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const alternarCancelamento = useMutation({
    mutationFn: async ({ id, cancelada }: { id: string; cancelada: boolean }) => {
      const { error } = await supabase.from("horarios").update({ cancelada }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.horarios }),
  });

  const criarVarias = useMutation({
    mutationFn: async (payload: Record<string, any>[]) => {
      const { error } = await supabase.from("horarios").insert(payload as any);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(
        vars.length === 1 ? "Aula criada." : `${vars.length} aulas criadas.`,
      );
      qc.invalidateQueries({ queryKey: qk.horarios });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const conflitosDe = (
    data: string,
    horario: string,
    ignorarId?: string,
  ) =>
    horarios.filter(
      (h) =>
        h.id !== ignorarId &&
        !h.cancelada &&
        h.data === data &&
        formatHora(h.horario) === formatHora(horario),
    );

  const [conflitos, setConflitos] = useState<typeof horarios>([]);

  return (
    <div>
      <PageTitle
        eyebrow="Administração"
        title="Horários"
        action={
          <NovaAulaDialog
            modalidades={modalidades.map((m) => ({ value: m.id, label: m.nome }))}
            checarConflitos={(data, horario) => conflitosDe(data, horario)}
            onConflito={setConflitos}
            onSubmit={(payload) => criarVarias.mutateAsync(payload)}
          />
        }
      />

      <Dialog open={conflitos.length > 0} onOpenChange={(o) => !o && setConflitos([])}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Choque de horário</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Já existe aula cadastrada neste dia e horário:</p>
            <ul className="space-y-1">
              {conflitos.map((c) => (
                <li key={c.id} className="rounded-md border border-border px-3 py-2 text-foreground">
                  <strong>{c.modalidades?.nome ?? "Aula"}</strong> · {formatDateLong(c.data)} às{" "}
                  {formatHora(c.horario)} · {c.instrutor}
                </li>
              ))}
            </ul>
            <p>Escolha outro horário ou outra data.</p>
          </div>
          <DialogFooter>
            <Button className="w-full" onClick={() => setConflitos([])}>
              Entendi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {isLoading ? (
        <EmptyState>Carregando…</EmptyState>
      ) : horarios.length === 0 ? (
        <EmptyState>Nenhuma aula cadastrada.</EmptyState>
      ) : (
        <div className="space-y-2">
          {horarios.map((h) => (
            <article key={h.id} className="surface-panel flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-lg text-foreground">
                  {h.modalidades?.nome}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateLong(h.data)} · {formatHora(h.horario)} · {h.instrutor} ·{" "}
                  {ocupacao?.get(h.id) ?? 0}/{h.limite_vagas} vagas
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  size="sm"
                  variant={h.cancelada ? "outline" : "ghost"}
                  onClick={() =>
                    alternarCancelamento.mutate({ id: h.id, cancelada: !h.cancelada })
                  }
                >
                  {h.cancelada ? "Reativar" : "Cancelar"}
                </Button>
                <RecordDialog
                  title="Editar aula"
                  fields={campos}
                  initial={h}
                  trigger={
                    <Button size="icon" variant="ghost" aria-label="Editar">
                      <Pencil className="size-4" />
                    </Button>
                  }
                  onSubmit={async (values) => {
                    const c = conflitosDe(values.data, values.horario, h.id);
                    if (c.length > 0) {
                      setConflitos(c);
                      throw new Error("Já existe uma aula neste dia e horário.");
                    }
                    await salvar.mutateAsync({ id: h.id, values });
                  }}

                />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost" aria-label="Excluir">
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir esta aula?</AlertDialogTitle>
                      <AlertDialogDescription>
                        As reservas dos alunos para este horário serão removidas.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => excluir.mutate(h.id)}>
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function NovaAulaDialog({
  modalidades,
  checarConflitos,
  onConflito,
  onSubmit,
}: {
  modalidades: { value: string; label: string }[];
  checarConflitos: (data: string, horario: string) => Horario[];
  onConflito: (conflitos: Horario[]) => void;
  onSubmit: (payload: Record<string, any>[]) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [datas, setDatas] = useState<Date[]>([]);
  const [form, setForm] = useState({
    modalidade_id: "",
    instrutor: "",
    horario: "",
    limite_vagas: 10,
    observacoes: "",
  });

  function set(campo: string, valor: any) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (datas.length === 0) {
      toast.error("Selecione ao menos uma data no calendário.");
      return;
    }
    const ordenadas = [...datas].sort((a, b) => a.getTime() - b.getTime());
    const conflitos = ordenadas.flatMap((d) => checarConflitos(toISO(d), form.horario));
    if (conflitos.length > 0) {
      onConflito(conflitos);
      return;
    }
    setBusy(true);
    try {
      await onSubmit(
        ordenadas.map((d) => ({
          modalidade_id: form.modalidade_id,
          instrutor: form.instrutor,
          horario: form.horario,
          limite_vagas: Number(form.limite_vagas) || 1,
          observacoes: form.observacoes || null,
          data: toISO(d),
        })),
      );
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }


  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setDatas([]);
          setForm({
            modalidade_id: "",
            instrutor: "",
            horario: "",
            limite_vagas: 10,
            observacoes: "",
          });
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> Nova
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Nova aula</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="na-mod">Modalidade</Label>
            <select
              id="na-mod"
              required
              value={form.modalidade_id}
              onChange={(e) => set("modalidade_id", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
            >
              <option value="">Selecione…</option>
              {modalidades.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="na-inst">Instrutor</Label>
            <Input
              id="na-inst"
              required
              maxLength={80}
              value={form.instrutor}
              onChange={(e) => set("instrutor", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Datas das aulas</Label>
            <p className="text-[11px] text-muted-foreground">
              Toque em vários dias para repetir a mesma aula na semana ou no mês.
            </p>
            <Calendar
              mode="multiple"
              selected={datas}
              onSelect={(d) => setDatas((d as Date[] | undefined) ?? [])}
              className="pointer-events-auto rounded-md border border-border p-3"
            />
            <p className="text-xs text-primary">
              {datas.length === 0
                ? "Nenhuma data selecionada"
                : `${datas.length} data${datas.length === 1 ? "" : "s"} selecionada${
                    datas.length === 1 ? "" : "s"
                  }`}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="na-hora">Horário</Label>
            <Input
              id="na-hora"
              type="time"
              required
              value={form.horario}
              onChange={(e) => set("horario", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="na-vagas">Limite de vagas</Label>
            <Input
              id="na-vagas"
              type="number"
              min={1}
              required
              value={form.limite_vagas}
              onChange={(e) => set("limite_vagas", Number(e.target.value))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="na-obs">Observações</Label>
            <Textarea
              id="na-obs"
              rows={3}
              value={form.observacoes}
              onChange={(e) => set("observacoes", e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Salvando…" : "Criar aulas"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
