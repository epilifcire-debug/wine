import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchPlanos, qk } from "@/lib/queries";
import { AdminGuard } from "@/components/AdminGuard";
import { EmptyState, PageTitle } from "@/components/AppShell";
import { RecordDialog, type FieldSpec } from "@/components/RecordDialog";
import { Button } from "@/components/ui/button";
import { PlanoDetails } from "@/components/PlanoDetails";
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

export const Route = createFileRoute("/_authenticated/admin/planos")({
  component: () => (
    <AdminGuard>
      <AdminPlanos />
    </AdminGuard>
  ),
  head: () => ({
    meta: [
      { title: "Gestão de planos — Wine Barbell Club" },
      {
        name: "description",
        content: "Cadastre planos comerciais, valores e o limite semanal de aulas de cada plano.",
      },
      { property: "og:title", content: "Gestão de planos — Wine Barbell Club" },
      { property: "og:description", content: "Planos, valores e limite semanal de aulas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const campos: FieldSpec[] = [
  { name: "nome", label: "Nome do plano", required: true, maxLength: 80 },
  { name: "descricao", label: "Descrição", type: "textarea" },
  { name: "preco", label: "Valor (R$)", type: "number" },
  {
    name: "forma_pagamento",
    label: "Forma de pagamento",
    placeholder: "PIX, cartão, dinheiro…",
    maxLength: 60,
  },
  {
    name: "tipo",
    label: "Tipo",
    type: "select",
    options: [
      { value: "recorrente", label: "Recorrente (mensal/trimestral)" },
      { value: "avulso", label: "Avulso (drop-in / evento)" },
    ],
  },
  { name: "duracao_meses", label: "Duração em meses (0 = avulso)", type: "number" },
  {
    name: "limite_semanal",
    label: "Limite de aulas por semana (vazio = ilimitado)",
    type: "number",
  },
  {
    name: "limite_mensal",
    label: "Limite de aulas por mês (vazio = não se aplica)",
    type: "number",
  },
  {
    name: "ilimitado",
    label: "Aulas ilimitadas (sem limite semanal)",
    type: "select",
    options: [
      { value: "nao", label: "Não" },
      { value: "sim", label: "Sim" },
    ],
  },
  {
    name: "acesso_livre",
    label: "Acesso livre",
    type: "select",
    options: [
      { value: "nao", label: "Não" },
      { value: "sim", label: "Sim" },
    ],
  },
  {
    name: "regras_acesso",
    label: "Regras de acesso",
    type: "textarea",
    placeholder: "Ex.: segunda a quinta-feira.",
  },
  {
    name: "beneficios",
    label: "Benefícios",
    type: "textarea",
    placeholder: "Separe por ponto e vírgula.",
  },
  { name: "ordem", label: "Ordem de exibição", type: "number" },
  {
    name: "ativo",
    label: "Status",
    type: "select",
    options: [
      { value: "sim", label: "Ativo" },
      { value: "nao", label: "Inativo" },
    ],
  },
];

function AdminPlanos() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: qk.planos, queryFn: fetchPlanos });

  const salvar = useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: Record<string, any> }) => {
      const payload = {
        nome: values.nome,
        descricao: values.descricao || null,
        limite_semanal: Number(values.limite_semanal) > 0 ? Number(values.limite_semanal) : null,
        limite_mensal: Number(values.limite_mensal) > 0 ? Number(values.limite_mensal) : null,
        preco_centavos: Math.round(Number(values.preco || 0) * 100),
        forma_pagamento: values.forma_pagamento || "PIX",
        duracao_meses: Number(values.duracao_meses || 0),
        acesso_livre: values.acesso_livre === "sim",
        ilimitado: values.ilimitado === "sim",
        beneficios: values.beneficios || null,
        regras_acesso: values.regras_acesso || null,
        tipo: values.tipo === "avulso" ? "avulso" : "recorrente",
        ordem: Number(values.ordem || 0),
        ativo: values.ativo !== "nao",
      };
      const { error } = id
        ? await supabase.from("planos").update(payload as any).eq("id", id)
        : await supabase.from("planos").insert(payload as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Plano salvo.");
      qc.invalidateQueries({ queryKey: qk.planos });
      qc.invalidateQueries({ queryKey: qk.alunos });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("planos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Plano removido.");
      qc.invalidateQueries({ queryKey: qk.planos });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageTitle
        eyebrow="Administração"
        title="Planos"
        action={
          <RecordDialog
            title="Novo plano"
            fields={campos}
            initial={{ ativo: "sim", ilimitado: "nao", ordem: 0, tipo: "recorrente", acesso_livre: "nao", forma_pagamento: "PIX", duracao_meses: 1 }}
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
        <EmptyState>Nenhum plano cadastrado.</EmptyState>
      ) : (
        <div className="space-y-2">
          {data.map((p) => (
            <article key={p.id} className="surface-panel flex items-start gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <PlanoDetails plano={p} mostrarStatus />
              </div>
              <div className="flex shrink-0 gap-1">
                <RecordDialog
                  title="Editar plano"
                  fields={campos}
                  initial={{
                    ...p,
                    preco: (p.preco_centavos ?? 0) / 100,
                    acesso_livre: p.acesso_livre ? "sim" : "nao",
                    ilimitado: p.ilimitado ? "sim" : "nao",
                    ativo: p.ativo ? "sim" : "nao",
                  }}
                  trigger={
                    <Button size="icon" variant="ghost" aria-label="Editar">
                      <Pencil className="size-4" />

                    </Button>
                  }
                  onSubmit={(values) => salvar.mutateAsync({ id: p.id, values })}
                />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost" aria-label="Excluir">
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir {p.nome}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Alunos vinculados a este plano ficarão sem plano definido.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => excluir.mutate(p.id)}>
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
