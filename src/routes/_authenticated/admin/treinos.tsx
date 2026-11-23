import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchModalidades, fetchTreinos, qk } from "@/lib/queries";
import { formatDateBR } from "@/lib/format";
import { AdminGuard } from "@/components/AdminGuard";
import { EmptyState, PageTitle } from "@/components/AppShell";
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

export const Route = createFileRoute("/_authenticated/admin/treinos")({
  component: () => (
    <AdminGuard>
      <AdminTreinos />
    </AdminGuard>
  ),
  head: () => ({
    meta: [
      { title: "Gestão de treinos — Wine Barbell Club" },
      { name: "description", content: "Publique os WODs por modalidade com séries e repetições." },
      { property: "og:title", content: "Gestão de treinos — Wine Barbell Club" },
      { property: "og:description", content: "Publicação de WODs do estúdio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function AdminTreinos() {
  const qc = useQueryClient();
  const { data: modalidades = [] } = useQuery({
    queryKey: qk.modalidades,
    queryFn: fetchModalidades,
  });
  const { data: treinos = [], isLoading } = useQuery({ queryKey: qk.treinos, queryFn: fetchTreinos });

  const campos: FieldSpec[] = [
    {
      name: "modalidade_id",
      label: "Modalidade",
      type: "select",
      required: true,
      options: modalidades.map((m) => ({ value: m.id, label: m.nome })),
    },
    { name: "nome", label: "Nome do treino", required: true, maxLength: 120 },
    { name: "data", label: "Data", type: "date", required: true },
    { name: "objetivo", label: "Objetivo", type: "textarea" },
    { name: "exercicios", label: "Exercícios", type: "textarea" },
    { name: "series", label: "Séries", maxLength: 60 },
    { name: "repeticoes", label: "Repetições", maxLength: 60 },
    { name: "tempo", label: "Tempo", maxLength: 60 },
    { name: "observacoes", label: "Observações", type: "textarea" },
    { name: "video_youtube_url", label: "Vídeo do YouTube (opcional)", maxLength: 500 },
  ];

  const salvar = useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: Record<string, any> }) => {
      const { error } = id
        ? await supabase.from("treinos").update(values as any).eq("id", id)
        : await supabase.from("treinos").insert(values as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Treino salvo.");
      qc.invalidateQueries({ queryKey: qk.treinos });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("treinos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Treino removido.");
      qc.invalidateQueries({ queryKey: qk.treinos });
    },
  });

  return (
    <div>
      <PageTitle
        eyebrow="Administração"
        title="Treinos"
        action={
          <RecordDialog
            title="Novo WOD"
            fields={campos}
            initial={{ data: new Date().toISOString().slice(0, 10) }}
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
      ) : treinos.length === 0 ? (
        <EmptyState>Nenhum treino publicado.</EmptyState>
      ) : (
        <div className="space-y-2">
          {treinos.map((t) => (
            <article key={t.id} className="surface-panel flex items-start gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="eyebrow">{t.modalidades?.nome}</p>
                <p className="truncate font-display text-lg text-foreground">{t.nome}</p>
                <p className="text-xs text-muted-foreground">{formatDateBR(t.data)}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <RecordDialog
                  title="Editar treino"
                  fields={campos}
                  initial={t}
                  trigger={
                    <Button size="icon" variant="ghost" aria-label="Editar">
                      <Pencil className="size-4" />
                    </Button>
                  }
                  onSubmit={(values) => salvar.mutateAsync({ id: t.id, values })}
                />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost" aria-label="Excluir">
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir {t.nome}?</AlertDialogTitle>
                      <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => excluir.mutate(t.id)}>
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
