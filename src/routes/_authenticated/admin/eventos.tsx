import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchEventos, qk, type Evento } from "@/lib/queries";
import { formatDateBR, formatHora, todayISO } from "@/lib/format";
import { AdminGuard } from "@/components/AdminGuard";
import { EmptyState, PageTitle } from "@/components/AppShell";
import { EventoImagem } from "@/routes/_authenticated/eventos";
import { RecordDialog, type FieldSpec } from "@/components/RecordDialog";
import { Button } from "@/components/ui/button";
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

export const Route = createFileRoute("/_authenticated/admin/eventos")({
  component: () => (
    <AdminGuard>
      <AdminEventos />
    </AdminGuard>
  ),
  head: () => ({
    meta: [
      { title: "Gestão de eventos — Wine Barbell Club" },
      {
        name: "description",
        content: "Crie, publique e edite os eventos do estúdio Wine Barbell Club.",
      },
      { property: "og:title", content: "Gestão de eventos — Wine Barbell Club" },
      { property: "og:description", content: "Administração dos eventos do estúdio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const campos: FieldSpec[] = [
  { name: "titulo", label: "Título", required: true, maxLength: 120 },
  { name: "imagem_url", label: "Imagem do evento", type: "image" },
  { name: "data", label: "Data", type: "date", required: true },
  { name: "horario", label: "Horário", type: "time" },
  { name: "local", label: "Local", maxLength: 160 },
  { name: "descricao", label: "Descrição", type: "textarea" },
  { name: "informacoes", label: "Informações adicionais", type: "textarea" },
];

function AdminEventos() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: qk.eventos, queryFn: fetchEventos });
  const hoje = todayISO();

  const salvar = useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: Record<string, any> }) => {
      const payload = {
        titulo: values.titulo,
        imagem_url: values.imagem_url || null,
        data: values.data,
        horario: values.horario || null,
        local: values.local || null,
        descricao: values.descricao || null,
        informacoes: values.informacoes || null,
      };
      const { error } = id
        ? await supabase.from("eventos").update(payload as never).eq("id", id)
        : await supabase.from("eventos").insert(payload as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Evento salvo.");
      qc.invalidateQueries({ queryKey: qk.eventos });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const publicar = useMutation({
    mutationFn: async ({ id, publicado }: { id: string; publicado: boolean }) => {
      const { error } = await supabase
        .from("eventos")
        .update({ publicado } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(v.publicado ? "Evento publicado." : "Evento despublicado.");
      qc.invalidateQueries({ queryKey: qk.eventos });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("eventos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Evento removido.");
      qc.invalidateQueries({ queryKey: qk.eventos });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function initialDe(e: Evento) {
    return {
      titulo: e.titulo,
      imagem_url: e.imagem_url ?? "",
      data: e.data?.slice(0, 10) ?? "",
      horario: e.horario?.slice(0, 5) ?? "",
      local: e.local ?? "",
      descricao: e.descricao ?? "",
      informacoes: e.informacoes ?? "",
    };
  }

  return (
    <div>
      <PageTitle
        eyebrow="Administração"
        title="Eventos"
        action={
          <RecordDialog
            title="Novo evento"
            fields={campos}
            trigger={
              <Button size="sm">
                <Plus className="size-4" /> Novo
              </Button>
            }
            onSubmit={(values) => salvar.mutateAsync({ values })}
          />
        }
      />

      {isLoading ? (
        <EmptyState>Carregando…</EmptyState>
      ) : data.length === 0 ? (
        <EmptyState>Nenhum evento cadastrado.</EmptyState>
      ) : (
        <div className="space-y-3">
          {data.map((e) => (
            <article key={e.id} className="surface-panel overflow-hidden">
              <EventoImagem path={e.imagem_url} alt={`Imagem do evento ${e.titulo}`} />
              <div className="flex items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-display text-xl leading-none text-gold-gradient">{e.titulo}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateBR(e.data)}
                    {e.horario ? ` · ${formatHora(e.horario)}` : ""}
                    {e.local ? ` · ${e.local}` : ""}
                  </p>
                  <div className="mt-1.5 flex gap-2 text-[10px] font-medium tracking-wide uppercase">
                    <span className={e.publicado ? "text-primary" : "text-muted-foreground"}>
                      {e.publicado ? "Publicado" : "Rascunho"}
                    </span>
                    <span className="text-muted-foreground">
                      {e.data >= hoje ? "Próximo" : "Anterior"}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={e.publicado ? "Despublicar" : "Publicar"}
                    onClick={() => publicar.mutate({ id: e.id, publicado: !e.publicado })}
                  >
                    {e.publicado ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                  <RecordDialog
                    title="Editar evento"
                    fields={campos}
                    initial={initialDe(e)}
                    trigger={
                      <Button size="icon" variant="ghost" aria-label="Editar">
                        <Pencil className="size-4" />
                      </Button>
                    }
                    onSubmit={(values) => salvar.mutateAsync({ id: e.id, values })}
                  />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" aria-label="Excluir">
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir {e.titulo}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => excluir.mutate(e.id)}>
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
