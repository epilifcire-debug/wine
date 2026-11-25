import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { emailVisivel } from "@/lib/auth-usuario.functions";

export const ADMIN_MASTER_EMAIL = "epilif.cire@gmail.com";

export type UsuarioAdmin = {
  id: string;
  email: string;
  nome: string;
  telefone: string | null;
  codigo_wbc: string | null;
  username: string | null;
  perfil: "admin_master" | "admin" | "professor" | "aluno";
  status: string;
  criado_em: string;
};

function assertMaster(claims: Record<string, unknown>) {
  const email = String((claims as any)?.email ?? "").toLowerCase();
  if (email !== ADMIN_MASTER_EMAIL) {
    throw new Error("Acesso restrito ao Administrador Master.");
  }
}

export const listarUsuarios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UsuarioAdmin[]> => {
    assertMaster(context.claims as Record<string, unknown>);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (error) throw error;

    const [{ data: roles }, { data: profiles }, { data: alunos }] = await Promise.all([
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.from("profiles").select("id, nome, telefone, codigo_wbc, username"),
      supabaseAdmin.from("alunos").select("user_id, nome, telefone, ativo"),
    ]);

    const roleMap = new Map<string, string[]>();
    for (const r of roles ?? []) {
      roleMap.set(r.user_id, [...(roleMap.get(r.user_id) ?? []), String(r.role)]);
    }
    const profMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const alunoMap = new Map((alunos ?? []).filter((a) => a.user_id).map((a) => [a.user_id!, a]));

    return users.users.map((u) => {
      const email = (u.email ?? "").toLowerCase();
      const rs = roleMap.get(u.id) ?? [];
      const perfil: UsuarioAdmin["perfil"] =
        email === ADMIN_MASTER_EMAIL
          ? "admin_master"
          : rs.includes("admin")
            ? "admin"
            : rs.includes("professor")
              ? "professor"
              : "aluno";
      const p = profMap.get(u.id);
      const a = alunoMap.get(u.id);
      return {
        id: u.id,
        email: emailVisivel(u.email) ?? "Sem e-mail",
        nome: p?.nome || a?.nome || (u.email ?? "").split("@")[0],
        telefone: p?.telefone ?? a?.telefone ?? null,
        codigo_wbc: p?.codigo_wbc ?? null,
        username: (p as any)?.username ?? null,
        perfil,
        status: a?.ativo === false ? "Inativo" : "Ativo",
        criado_em: u.created_at,
      };
    });
  });

export const definirPerfil = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        userId: z.string().uuid(),
        perfil: z.enum(["aluno", "professor", "admin"]),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    assertMaster(context.claims as Record<string, unknown>);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: alvo } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    if ((alvo?.user?.email ?? "").toLowerCase() === ADMIN_MASTER_EMAIL) {
      throw new Error("O Administrador Master não pode ter o perfil alterado.");
    }

    const { error: delErr } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId);
    if (delErr) throw delErr;

    // A ficha nunca é apagada: histórico, reservas e o ID WBC pertencem à pessoa.
    // Ao promover, apenas desativamos a ficha (antes de gravar o novo papel,
    // pois contas administrativas não podem ter ficha ativa).
    await supabaseAdmin
      .from("alunos")
      .update({ ativo: data.perfil === "aluno" })
      .eq("user_id", data.userId);

    const { error: insErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.perfil as never });
    if (insErr) throw insErr;

    return { ok: true };
  });

/** Administração (admin ou master) — usada nas listagens administrativas. */
async function assertAdmin(context: any) {
  const email = String((context?.claims as any)?.email ?? "").toLowerCase();
  if (email === ADMIN_MASTER_EMAIL) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin" as never)
    .maybeSingle();
  if (!data) throw new Error("Acesso restrito à administração.");
}

export type AlunoAdmin = {
  id: string | null;
  user_id: string | null;
  nome: string;
  email: string | null;
  telefone: string | null;
  codigo_wbc: string | null;
  genero: string | null;
  plano_id: string | null;
  ativo: boolean;
  nascimento_mascarado: string | null;
  created_at: string | null;
};

/**
 * Fonte de verdade da página Alunos: toda conta com papel "aluno" aparece,
 * tenha ou não ficha, plano, reserva ou pagamento (LEFT JOIN com alunos).
 * Fichas ainda sem conta vinculada também continuam listadas.
 */
export const listarAlunos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AlunoAdmin[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: users, error: uErr }, { data: roles }, { data: profiles }, { data: fichas }] =
      await Promise.all([
        supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
        supabaseAdmin.from("user_roles").select("user_id, role"),
        supabaseAdmin.from("profiles").select("id, nome, telefone, codigo_wbc, username"),
        supabaseAdmin.from("alunos").select("*"),
      ]);
    if (uErr) throw uErr;

    const roleMap = new Map<string, string[]>();
    for (const r of roles ?? []) {
      roleMap.set(r.user_id, [...(roleMap.get(r.user_id) ?? []), String(r.role)]);
    }
    const profMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const fichaPorUser = new Map(
      (fichas ?? []).filter((a: any) => a.user_id).map((a: any) => [a.user_id as string, a]),
    );

    const lista: AlunoAdmin[] = [];

    for (const u of users.users) {
      const email = (u.email ?? "").toLowerCase();
      const rs = roleMap.get(u.id) ?? [];
      const ehAluno =
        email !== ADMIN_MASTER_EMAIL &&
        !rs.includes("admin") &&
        !rs.includes("admin_master") &&
        !rs.includes("professor");
      if (!ehAluno) continue;
      const p = profMap.get(u.id);
      const a: any = fichaPorUser.get(u.id);
      lista.push({
        id: a?.id ?? null,
        user_id: u.id,
        nome: a?.nome || p?.nome || (u.email ?? "").split("@")[0],
        email: a?.email ?? emailVisivel(u.email),
        telefone: a?.telefone ?? p?.telefone ?? null,
        codigo_wbc: p?.codigo_wbc ?? a?.codigo_wbc ?? null,
        genero: a?.genero ?? null,
        plano_id: a?.plano_id ?? null,
        ativo: a?.ativo !== false,
        nascimento_mascarado: a?.nascimento_mascarado ?? null,
        created_at: a?.created_at ?? u.created_at,
      });
    }

    for (const a of (fichas ?? []) as any[]) {
      if (a.user_id) continue;
      lista.push({
        id: a.id,
        user_id: null,
        nome: a.nome,
        email: a.email ?? null,
        telefone: a.telefone ?? null,
        codigo_wbc: a.codigo_wbc ?? null,
        genero: a.genero ?? null,
        plano_id: a.plano_id ?? null,
        ativo: a.ativo !== false,
        nascimento_mascarado: a.nascimento_mascarado ?? null,
        created_at: a.created_at ?? null,
      });
    }

    return lista.sort((x, y) => x.nome.localeCompare(y.nome, "pt-BR"));
  });

export type ContaSemFicha = { id: string; email: string; nome: string };

export type RelatorioAlunos = {
  total: number;
  semPlano: number;
  semUserId: number;
  contasSemFicha: number;
  duplicidades: number;
};

/** Contas de aluno (não administrativas) que ainda não possuem ficha. */
export const listarContasSemFicha = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ContaSemFicha[]> => {
    assertMaster(context.claims as Record<string, unknown>);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: users, error }, { data: alunos }, { data: roles }] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      supabaseAdmin.from("alunos").select("user_id"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);
    if (error) throw error;

    const comFicha = new Set((alunos ?? []).map((a) => a.user_id).filter(Boolean) as string[]);
    const admins = new Set(
      (roles ?? [])
        .filter((r) => ["admin", "admin_master", "professor"].includes(String(r.role)))
        .map((r) => r.user_id),
    );

    return users.users
      .filter((u) => !comFicha.has(u.id) && !admins.has(u.id))
      .filter((u) => (u.email ?? "").toLowerCase() !== ADMIN_MASTER_EMAIL)
      .map((u) => ({
        id: u.id,
        email: emailVisivel(u.email) ?? "Sem e-mail",
        nome:
          (u.user_metadata?.nome as string) ||
          (u.user_metadata?.full_name as string) ||
          (u.email ?? "").split("@")[0],
      }));
  });

/** Vincula manualmente uma ficha de aluno a uma conta de acesso. */
export const vincularAlunoConta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ alunoId: z.string().uuid(), userId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ context, data }) => {
    assertMaster(context.claims as Record<string, unknown>);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existente } = await supabaseAdmin
      .from("alunos")
      .select("id")
      .eq("user_id", data.userId)
      .maybeSingle();
    if (existente) throw new Error("Esta conta já está vinculada a outra ficha.");

    const { error } = await supabaseAdmin
      .from("alunos")
      .update({ user_id: data.userId })
      .eq("id", data.alunoId)
      .is("user_id", null);
    if (error) throw error;
    return { ok: true };
  });

/** Relatório numérico da base de alunos. */
export const relatorioAlunos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RelatorioAlunos> => {
    assertMaster(context.claims as Record<string, unknown>);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: users }, { data: alunos }, { data: roles }] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      supabaseAdmin.from("alunos").select("id, user_id, email, telefone, plano_id"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);

    const todas = alunos ?? [];
    const comFicha = new Set(todas.map((a) => a.user_id).filter(Boolean) as string[]);
    const admins = new Set(
      (roles ?? [])
        .filter((r) => ["admin", "admin_master", "professor"].includes(String(r.role)))
        .map((r) => r.user_id),
    );
    const emailMaster = (users?.users ?? []).find(
      (u) => (u.email ?? "").toLowerCase() === ADMIN_MASTER_EMAIL,
    )?.id;
    // Fichas de admin e professor não contam como aluno.
    const lista = todas.filter(
      (a) => !a.user_id || (!admins.has(a.user_id) && a.user_id !== emailMaster),
    );

    const chaves = new Map<string, number>();
    for (const a of lista) {
      const email = (a.email ?? "").trim().toLowerCase();
      const tel = (a.telefone ?? "").replace(/\D/g, "");
      for (const k of [email && `e:${email}`, tel && `t:${tel}`].filter(Boolean) as string[]) {
        chaves.set(k, (chaves.get(k) ?? 0) + 1);
      }
    }

    return {
      total: lista.length,
      semPlano: lista.filter((a) => !a.plano_id).length,
      semUserId: lista.filter((a) => !a.user_id).length,
      contasSemFicha: (users?.users ?? []).filter(
        (u) =>
          !comFicha.has(u.id) &&
          !admins.has(u.id) &&
          (u.email ?? "").toLowerCase() !== ADMIN_MASTER_EMAIL,
      ).length,
      duplicidades: [...chaves.values()].filter((n) => n > 1).length,
    };
  });
