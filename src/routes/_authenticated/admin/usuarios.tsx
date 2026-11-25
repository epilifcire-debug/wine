import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { definirPerfil, listarUsuarios, type UsuarioAdmin } from "@/lib/admin-users.functions";
import { maskTelefone } from "@/lib/format";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState, PageTitle } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  component: UsuariosAdmin,
  head: () => ({
    meta: [
      { title: "Gestão de usuários — Wine Barbell Club" },
      {
        name: "description",
        content: "Administrador Master: defina os perfis de acesso dos usuários do estúdio.",
      },
      { property: "og:title", content: "Gestão de usuários — Wine Barbell Club" },
      { property: "og:description", content: "Controle de perfis e acessos do Wine Barbell Club." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const PERFIS = ["aluno", "professor", "admin"] as const;

const GRUPOS: { titulo: string; vazio: string; perfis: UsuarioAdmin["perfil"][] }[] = [
  { titulo: "Administradores", vazio: "Nenhum administrador.", perfis: ["admin_master", "admin"] },
  { titulo: "Professores", vazio: "Nenhum professor.", perfis: ["professor"] },
  { titulo: "Alunos", vazio: "Nenhum aluno.", perfis: ["aluno"] },
];

function UsuariosAdmin() {
  const { isAdminMaster, loading } = useAuth();
  const qc = useQueryClient();
  const listar = useServerFn(listarUsuarios);
  const definir = useServerFn(definirPerfil);

  const { data: usuarios = [], isLoading } = useQuery<UsuarioAdmin[]>({
    queryKey: ["admin-usuarios"],
    queryFn: () => listar(),
    enabled: isAdminMaster,
  });

  const alterar = useMutation({
    mutationFn: (v: { userId: string; perfil: (typeof PERFIS)[number] }) => definir({ data: v }),
    onSuccess: () => {
      toast.success("Perfil atualizado.");
      qc.invalidateQueries({ queryKey: ["admin-usuarios"] });
      qc.invalidateQueries({ queryKey: ["admin-alunos"] });
      qc.invalidateQueries({ queryKey: ["admin-contas-sem-ficha"] });
      qc.invalidateQueries({ queryKey: ["admin-relatorio-alunos"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível alterar o perfil."),
  });

  if (loading) return <EmptyState>Verificando permissões…</EmptyState>;
  if (!isAdminMaster)
    return <EmptyState>Esta área é exclusiva do Administrador Master.</EmptyState>;

  return (
    <>
      <PageTitle eyebrow="Administrador Master" title="Usuários" />
      {isLoading ? (
        <EmptyState>Carregando usuários…</EmptyState>
      ) : (
        <div className="space-y-6">
          {GRUPOS.map((g) => {
            const lista = usuarios.filter((u) => g.perfis.includes(u.perfil));
            return (
              <section key={g.titulo}>
                <h2 className="mb-2 font-display text-xl text-foreground">
                  {g.titulo} <span className="text-sm text-muted-foreground">({lista.length})</span>
                </h2>
                {lista.length === 0 ? (
                  <EmptyState>{g.vazio}</EmptyState>
                ) : (
                  <div className="space-y-3">
                    {lista.map((u) => (
            <div key={u.id} className="surface-panel px-4 py-4">
              <p className="font-display text-lg text-foreground">{u.nome}</p>
              <p className="font-mono text-[11px] tracking-wide text-primary">
                {u.codigo_wbc ?? "sem ID"}
              </p>
              {u.username && <p className="text-xs text-foreground">@{u.username}</p>}
              <p className="text-xs text-muted-foreground">{u.email}</p>
              {u.telefone && (
                <p className="text-xs text-muted-foreground">{maskTelefone(u.telefone)}</p>
              )}
              <div className="mt-3">
                {u.perfil === "admin_master" ? (
                  <p className="text-sm font-semibold text-primary">Administrador Master</p>
                ) : (
                  <Select
                    value={u.perfil}
                    onValueChange={(v) =>
                      alterar.mutate({ userId: u.id, perfil: v as (typeof PERFIS)[number] })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERFIS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p === "aluno" ? "Aluno" : p === "professor" ? "Professor" : "Administrador"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
