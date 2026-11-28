import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Eye, Link2, Pencil, Plus, Trash2 } from "lucide-react";
import { RedefinirSenhaButton } from "@/components/RedefinirSenhaButton";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchPlanos,
  fetchTodosContratos,
  mapaContratos,
  qk,
  situacaoRecorrencia,
  statusContrato,
} from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import {
  listarAlunos,
  listarContasSemFicha,
  relatorioAlunos,
  vincularAlunoConta,
} from "@/lib/admin-users.functions";
import { formatDateBR, NASCIMENTO_MASCARADO, telefoneValido, tratamentoAluno } from "@/lib/format";
import { AdminGuard } from "@/components/AdminGuard";
import { EmptyState, PageTitle } from "@/components/AppShell";
import { RecordDialog, type FieldSpec } from "@/components/RecordDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
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


export const Route = createFileRoute("/_authenticated/admin/alunos")({
  validateSearch: (search: Record<string, unknown>) => ({
    filtro: typeof search.filtro === "string" ? search.filtro : undefined,
  }),
  component: () => (
    <AdminGuard>
      <AdminAlunos />
    </AdminGuard>
  ),
  head: () => ({
    meta: [
      { title: "Gestão de alunos — Wine Barbell Club" },
      { name: "description", content: "Cadastro e edição das fichas dos alunos do estúdio." },
      { property: "og:title", content: "Gestão de alunos — Wine Barbell Club" },
      { property: "og:description", content: "CRUD completo de alunos com dados protegidos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function camposAluno(planos: { id: string; nome: string }[]): FieldSpec[] {
  return [
    ...campos,
    {
      name: "plano_id",
      label: "Plano",
      type: "select",
      options: planos.map((p) => ({ value: p.id, label: p.nome })),
    },
  ];
}

const campos: FieldSpec[] = [
  { name: "nome", label: "Nome completo", required: true, maxLength: 120 },
  { name: "data_nascimento", label: "Data de nascimento", type: "date" },
  { name: "telefone", label: "Telefone", placeholder: "(99)99999-9999", maxLength: 14, mask: "telefone" },
  { name: "email", label: "E-mail", type: "email", maxLength: 255 },
  {
    name: "genero",
    label: "Gênero",
    type: "select",
    options: [
      { value: "masculino", label: "Masculino" },
      { value: "feminino", label: "Feminino" },
      { value: "neutro", label: "Neutro" },
    ],
  },
  { name: "endereco", label: "Endereço", maxLength: 255 },
  { name: "contato_emergencia", label: "Contato de emergência", maxLength: 255 },
  { name: "observacoes", label: "Observações", type: "textarea" },
  { name: "foto_url", label: "Foto do aluno", type: "image" },
];

const FILTROS = [
  { value: "todos", label: "Todos" },
  { value: "ativos", label: "Ativos" },
  { value: "sem_plano", label: "Sem plano" },
  { value: "proximo_vencimento", label: "Próximos do vencimento" },
  { value: "vencidos", label: "Planos vencidos" },
  { value: "inativos", label: "Inativos" },
  { value: "sem_conta", label: "Conta não vinculada" },
] as const;

type Filtro = (typeof FILTROS)[number]["value"];

function AdminAlunos() {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const navigate = Route.useNavigate();
  const { filtro: filtroUrl } = Route.useSearch();
  const [busca, setBusca] = useState("");
  const filtro: Filtro = FILTROS.some((f) => f.value === filtroUrl)
    ? (filtroUrl as Filtro)
    : "todos";
  const setFiltro = (v: Filtro) =>
    navigate({ search: { filtro: v === "todos" ? undefined : v }, replace: true });
  const [revelado, setRevelado] = useState<Record<string, { nasc: string }>>({});

  const carregarAlunos = useServerFn(listarAlunos);
  const {
    data = [],
    isLoading,
    error: erroLista,
  } = useQuery({ queryKey: ["admin-alunos"], queryFn: () => carregarAlunos() });
  const { data: planos = [] } = useQuery({ queryKey: qk.planos, queryFn: fetchPlanos });
  const { data: contratos = [] } = useQuery({
    queryKey: qk.contratos(),
    queryFn: fetchTodosContratos,
  });
  const contratoPorAluno = mapaContratos(contratos as any);
  // Sinalizador de recorrência: contrato mais recente (pendente ou vigente) com recorrência.
  const recorrenciaPorAluno = new Map<string, ReturnType<typeof situacaoRecorrencia>>();
  for (const c of contratos as any[]) {
    if (recorrenciaPorAluno.has(c.aluno_id) || c.status === "cancelado") continue;
    const sit = situacaoRecorrencia(c);
    if (sit) recorrenciaPorAluno.set(c.aluno_id, sit);
  }

  const listarContas = useServerFn(listarContasSemFicha);
  const relatorio = useServerFn(relatorioAlunos);
  const vincular = useServerFn(vincularAlunoConta);

  const { data: contasSemFicha = [] } = useQuery({
    queryKey: ["admin-contas-sem-ficha"],
    queryFn: () => listarContas(),
    enabled: isAdmin,
  });
  const { data: numeros } = useQuery({
    queryKey: ["admin-relatorio-alunos"],
    queryFn: () => relatorio(),
    enabled: isAdmin,
  });

  const vincularConta = useMutation({
    mutationFn: (v: { alunoId: string; userId: string }) => vincular({ data: v }),
    onSuccess: () => {
      toast.success("Conta vinculada à ficha.");
      qc.invalidateQueries({ queryKey: qk.alunos });
      qc.invalidateQueries({ queryKey: ["admin-contas-sem-ficha"] });
      qc.invalidateQueries({ queryKey: ["admin-relatorio-alunos"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível vincular a conta."),
  });

  // Seletor mostra apenas planos ativos; o plano atual do aluno (mesmo inativo)
  // continua visível ao editar para não perder a referência.
  const planosSelecao = (atual?: string | null) =>
    (planos as any[]).filter((p) => p.ativo || p.id === atual);
  const fields = camposAluno(planosSelecao());
  const nomePlano = (id?: string | null) => planos.find((p) => p.id === id)?.nome ?? null;


  const salvar = useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: Record<string, any> }) => {
      const { data_nascimento, ...rest } = values;
      const ficha = { ...rest, plano_id: rest.plano_id || null };
      let alunoId = id;
      if (id) {
        const { error } = await supabase.from("alunos").update(ficha as any).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("alunos")
          .insert({ ...ficha, whatsapp_optin: telefoneValido(rest.telefone) } as any)
          .select("id")
          .single();
        if (error) throw error;
        alunoId = data.id;
      }
      if (data_nascimento) {
        const { error } = await supabase.from("alunos_sensiveis").upsert(
          {
            aluno_id: alunoId!,
            data_nascimento: data_nascimento || null,
          },
          { onConflict: "aluno_id" } as any,
        );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Ficha salva.");
      qc.invalidateQueries({ queryKey: qk.alunos });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("alunos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ficha removida.");
      qc.invalidateQueries({ queryKey: qk.alunos });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function revelar(alunoId: string) {
    const { data, error } = await supabase
      .from("alunos_sensiveis")
      .select("data_nascimento")
      .eq("aluno_id", alunoId)
      .maybeSingle();
    if (error) {
      toast.error("Sem permissão para ver estes dados.");
      return;
    }
    setRevelado((r) => ({
      ...r,
      [alunoId]: { nasc: formatDateBR(data?.data_nascimento) },
    }));
    toast.info("Dados exibidos temporariamente nesta tela.");
  }

  function passaFiltro(a: any) {
    const st = statusContrato(contratoPorAluno.get(a.id));
    switch (filtro) {
      case "ativos":
        return a.ativo !== false;
      case "sem_plano":
        return !a.plano_id && (!st || st === "cancelado");
      case "proximo_vencimento":
        return st === "proximo_vencimento";
      case "vencidos":
        return st === "vencido";
      case "inativos":
        return a.ativo === false;
      case "sem_conta":
        return !a.user_id;
      default:
        return true;
    }
  }

  const termo = busca.trim().toLowerCase();
  const lista = (data as any[])
    .filter((a) =>
      `${a.nome} ${a.email ?? ""} ${a.telefone ?? ""} ${a.codigo_wbc ?? ""}`
        .toLowerCase()
        .includes(termo),
    )
    .filter(passaFiltro);

  function rotuloStatus(a: any) {
    if (a.ativo === false) return "Inativo";
    const st = statusContrato(contratoPorAluno.get(a.id));
    if (!st || st === "cancelado") return "Sem plano";
    if (st === "vencido") return "Plano vencido";
    if (st === "proximo_vencimento") return "Próximo do vencimento";
    return "Ativo";
  }


  return (
    <div>
      <PageTitle
        eyebrow="Administração"
        title="Alunos"
        action={
          <RecordDialog
            title="Novo aluno"
            fields={fields}
            trigger={
              <Button size="sm">
                <Plus className="size-4" /> Novo
              </Button>
            }
            onSubmit={(values) => salvar.mutateAsync({ values })}
          />
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por ID WBC, nome, telefone ou e-mail…"
          aria-label="Buscar aluno"
        />
        <Select value={filtro} onValueChange={(v) => setFiltro(v as Filtro)}>
          <SelectTrigger className="sm:w-64" aria-label="Filtrar alunos">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTROS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isAdmin && numeros && (
        <div className="surface-panel mb-4 grid grid-cols-2 gap-3 px-4 py-3 text-xs sm:grid-cols-5">
          {[
            ["Total de fichas", numeros.total],
            ["Sem plano", numeros.semPlano],
            ["Sem conta vinculada", numeros.semUserId],
            ["Contas sem ficha", numeros.contasSemFicha],
            ["Duplicidades", numeros.duplicidades],
          ].map(([label, valor]) => (
            <div key={String(label)}>
              <p className="font-display text-xl text-primary">{valor as number}</p>
              <p className="text-muted-foreground">{label as string}</p>
            </div>
          ))}
        </div>
      )}

      <p className="mb-2 text-xs text-muted-foreground">
        {lista.length} aluno(s) exibido(s) de {(data as any[]).length}.
      </p>


      {isLoading ? (
        <EmptyState>Carregando…</EmptyState>
      ) : lista.length === 0 ? (
        <EmptyState>Nenhum aluno cadastrado.</EmptyState>
      ) : (
        <div className="space-y-2">
          {lista.map((a) => {
            const rev = revelado[a.id];
            return (
              <article key={a.id} className="surface-panel px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-lg text-foreground">
                      {a.nome}{" "}
                      <span className="align-middle text-[10px] uppercase tracking-wide text-primary">
                        {tratamentoAluno(a.genero)}
                      </span>
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full border border-primary/40 px-2 py-0.5 font-mono text-[10px] tracking-wide text-primary">
                        {a.codigo_wbc ?? "sem ID"}
                      </span>
                      <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {rotuloStatus(a)}
                      </span>
                      {a.id && recorrenciaPorAluno.get(a.id) && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${recorrenciaPorAluno.get(a.id)!.ativa ? "bg-primary/15 text-primary" : "border border-primary/40 text-primary"}`}
                        >
                          {recorrenciaPorAluno.get(a.id)!.label}
                        </span>
                      )}
                      {!a.user_id && (
                        <span className="rounded-full border border-primary/40 px-2 py-0.5 text-[10px] uppercase tracking-wide text-primary">
                          Conta não vinculada
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.email ?? "Não informado"} · {a.telefone ?? "Não informado"}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 text-[11px] text-muted-foreground">
                      <span>
                        Plano:{" "}
                        <span className="text-primary">{nomePlano(a.plano_id) ?? "Sem plano"}</span>
                      </span>
                      <span>
                        Cadastro:{" "}
                        <span className="text-primary">
                          {formatDateBR(a.created_at?.slice(0, 10)) || "Não informado"}
                        </span>
                      </span>
                      <span>
                        Nasc.:{" "}
                        <span className="font-mono text-primary">
                          {rev?.nasc ?? (a.nascimento_mascarado ? NASCIMENTO_MASCARADO : "—")}
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {isAdmin && !a.user_id && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="icon" variant="ghost" aria-label="Vincular conta">
                            <Link2 className="size-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Vincular conta a {a.nome}</DialogTitle>
                          </DialogHeader>
                          {contasSemFicha.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              Nenhuma conta de acesso disponível para vinculação.
                            </p>
                          ) : (
                            <Select
                              onValueChange={(userId) =>
                                vincularConta.mutate({ alunoId: a.id!, userId })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Escolha a conta" />
                              </SelectTrigger>
                              <SelectContent>
                                {contasSemFicha.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.nome} — {c.email}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </DialogContent>
                      </Dialog>
                    )}

                    {a.id && (<>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" aria-label="Revelar dados">
                          <Eye className="size-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Revelar dados sensíveis?</AlertDialogTitle>
                          <AlertDialogDescription>
                            A data de nascimento é um dado protegido. Exiba somente quando
                            necessário e evite fazê-lo em locais públicos.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => revelar(a.id!)}>
                            Revelar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <RecordDialog
                      title="Editar aluno"
                      fields={camposAluno(planosSelecao(a.plano_id))}
                      initial={a}
                      trigger={
                        <Button size="icon" variant="ghost" aria-label="Editar">
                          <Pencil className="size-4" />
                        </Button>
                      }
                      onSubmit={(values) => salvar.mutateAsync({ id: a.id!, values })}
                    />

                    {a.user_id && <RedefinirSenhaButton userId={a.user_id} nome={a.nome} />}

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" aria-label="Excluir">
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir {a.nome}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Todas as reservas deste aluno serão removidas.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => excluir.mutate(a.id!)}>
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    </>)}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
