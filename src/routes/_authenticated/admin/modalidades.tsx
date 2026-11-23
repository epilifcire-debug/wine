import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchModalidades, qk } from "@/lib/queries";
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

export const Route = createFileRoute("/_authenticated/admin/modalidades")({
  component: () => (
    <AdminGuard>
      <AdminModalidades />
    </AdminGuard>
  ),
  head: () => ({
    meta: [
      { title: "Gestão de modalidades — Wine Barbell Club" },
      { name: "description", content: "Crie e edite as modalidades oferecidas pelo estúdio." },
      { property: "og:title", content: "Gestão de modalidades — Wine Barbell Club" },
      { property: "og:description", content: "CRUD de modalidades dinâmicas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const campos: FieldSpec[] = [
  { name: "nome", label: "Nome", required: true, maxLength: 80 },
  { name: "descricao", label: "Descrição curta", maxLength: 200 },
  { name: "o_que_e", label: "O que é", type: "textarea" },
  { name: "como_funciona", label: "Como funciona uma aula", type: "textarea" },
  { name: "beneficios", label: "Benefícios", type: "textarea" },
  { name: "exercicios", label: "Exercícios / movimentos", type: "textarea" },
  { name: "video_youtube_url", label: "Vídeo do YouTube (URL)", maxLength: 500 },
  {
    name: "galeria",
    label: "Galeria (URLs separadas por vírgula)",
    type: "textarea",
  },
];

function AdminModalidades() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: qk.modalidades, queryFn: fetchModalidades });

  const salvar = useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: Record<string, any> }) => {
      const { galeria, ...rest } = values;
      const payload = {
        ...rest,
        galeria_imagens: String(galeria ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
      const { error } = id
        ? await supabase.from("modalidades").update(payload as any).eq("id", id)
        : await supabase.from("modalidades").insert(payload as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Modalidade salva.");
      qc.invalidateQueries({ queryKey: qk.modalidades });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("modalidades").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Modalidade removida.");
      qc.invalidateQueries({ queryKey: qk.modalidades });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageTitle
        eyebrow="Administração"
        title="Modalidades"
        action={
          <RecordDialog
            title="Nova modalidade"
            fields={campos}
            trigger={
              <Button size="sm">
                <Plus className="size-4" /> Nova
              </Button>
            }
            onSubmit={(values) => salvar.mutateAsync({ values })}
          />
        }
      />

      {isLoading ? (
        <EmptyState>Carregando…</EmptyState>
      ) : data.length === 0 ? (
        <EmptyState>Nenhuma modalidade cadastrada.</EmptyState>
      ) : (
        <div className="space-y-2">
          {data.map((m) => (
            <article key={m.id} className="surface-panel flex items-start gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-display text-xl text-gold-gradient">{m.nome}</p>
                <p className="line-clamp-2 text-xs text-muted-foreground">{m.descricao}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <RecordDialog
                  title="Editar modalidade"
                  fields={campos}
                  initial={{ ...m, galeria: (m.galeria_imagens ?? []).join(", ") }}
                  trigger={
                    <Button size="icon" variant="ghost" aria-label="Editar">
                      <Pencil className="size-4" />
                    </Button>
                  }
                  onSubmit={(values) => salvar.mutateAsync({ id: m.id, values })}
                />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost" aria-label="Excluir">
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir {m.nome}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Horários e treinos vinculados a esta modalidade também serão removidos.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => excluir.mutate(m.id)}>
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
