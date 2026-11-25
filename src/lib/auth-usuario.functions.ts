import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Domínio interno das contas cadastradas sem e-mail (nunca recebe mensagens). */
export const DOMINIO_SEM_EMAIL = "sem-email.wbc.invalid";

export function emailVisivel(email?: string | null) {
  if (!email || email.toLowerCase().endsWith(`@${DOMINIO_SEM_EMAIL}`)) return null;
  return email;
}

const usuarioSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9._]{3,20}$/, "O usuário deve ter de 3 a 20 caracteres: letras, números, ponto ou _.");

type Sessao = { access_token: string; refresh_token: string };

/** Cliente descartável só para o login (não reaproveita o cliente de serviço). */
async function entrar(email: string, senha: string) {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !chave) throw new Error("Configuração do servidor incompleta (SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY).");
  // Chaves novas (sb_publishable_) não são JWT: não podem ir como Bearer.
  const fetchChave: typeof fetch = (input, init) => {
    const headers = new Headers(init?.headers);
    if (chave.startsWith("sb_") && headers.get("Authorization") === `Bearer ${chave}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", chave);
    return fetch(input, { ...init, headers });
  };
  const cliente = createClient(url, chave, {
    global: { fetch: fetchChave },
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
  return cliente.auth.signInWithPassword({ email, password: senha });
}

const ERRO_LOGIN = "Usuário, e-mail ou senha incorretos.";

/** Entra com nome de usuário (o e-mail nunca volta para o navegador). */
export const entrarComUsuario = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ usuario: z.string().trim().min(1).max(40), senha: z.string().min(1).max(200) }).parse(data),
  )
  .handler(async ({ data }): Promise<Sessao> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: perfil } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("username", data.usuario.toLowerCase())
      .maybeSingle();
    if (!perfil) throw new Error(ERRO_LOGIN);

    const { data: conta, error: contaErr } = await supabaseAdmin.auth.admin.getUserById(perfil.id);
    if (contaErr || !conta.user?.email) throw new Error(ERRO_LOGIN);

    const { data: login, error } = await entrar(conta.user.email, data.senha);
    if (error || !login.session) throw new Error(ERRO_LOGIN);
    return { access_token: login.session.access_token, refresh_token: login.session.refresh_token };
  });

/** Cadastro sem confirmação por e-mail; e-mail opcional. */
export const cadastrarConta = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        nome: z.string().trim().min(2, "Informe seu nome.").max(80),
        usuario: usuarioSchema,
        email: z.string().trim().toLowerCase().email("E-mail inválido.").max(120).optional().or(z.literal("")),
        senha: z.string().min(6, "A senha deve ter pelo menos 6 caracteres.").max(200),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<Sessao> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existente } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("username", data.usuario)
      .maybeSingle();
    if (existente) throw new Error("Este nome de usuário já está em uso.");

    const email = data.email || `${data.usuario}@${DOMINIO_SEM_EMAIL}`;
    const { error: criarErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.senha,
      email_confirm: true,
      user_metadata: { nome: data.nome, username: data.usuario },
    });
    if (criarErr) {
      if (/already|registered|exists/i.test(criarErr.message)) {
        throw new Error("Este e-mail já está cadastrado.");
      }
      throw new Error("Não foi possível criar a conta. Tente novamente.");
    }

    const { data: login, error } = await entrar(email, data.senha);
    if (error || !login.session) throw new Error("Conta criada. Entre com seu usuário e senha.");
    return { access_token: login.session.access_token, refresh_token: login.session.refresh_token };
  });
