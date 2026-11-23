import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, KeyRound, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  aulasNaSemana,
  fetchMeuPlano,
  fetchMinhasReservas,
  precoBRL,
  qk,
  signedAvatar,
} from "@/lib/queries";
import {
  formatDateLong,
  formatHora,
  maskTelefone,
  erroTelefone,
  GENEROS,
  tratamentoAluno,
} from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { EmptyState, PageTitle } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/perfil")({
  component: Perfil,
  head: () => ({
    meta: [
      { title: "Meu perfil — Wine Barbell Club" },
      { name: "description", content: "Seus dados, histórico de aulas e configurações da conta." },
      { property: "og:title", content: "Meu perfil — Wine Barbell Club" },
      { property: "og:description", content: "Dados pessoais e histórico de aulas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Perfil() {
  const { perfil, aluno, user, refresh } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    nome: perfil?.nome ?? aluno?.nome ?? "",
    telefone: maskTelefone(perfil?.telefone ?? aluno?.telefone ?? ""),
    genero: (aluno as any)?.genero ?? "",
    email: aluno?.email ?? user?.email ?? "",
    endereco: (aluno as any)?.endereco ?? "",
    contato_emergencia: (aluno as any)?.contato_emergencia ?? "",
    observacoes: (aluno as any)?.observacoes ?? "",
  });
  const [novaSenha, setNovaSenha] = useState("");
  const [busy, setBusy] = useState(false);

  // A ficha e o perfil chegam de forma assíncrona: sem esta sincronização o
  // formulário ficava com os campos vazios e gravava vazio por cima ao salvar.
  const carregadoDe = useRef<string | null>(null);
  const chaveDados = `${perfil?.id ?? ""}:${aluno?.id ?? ""}`;
  useEffect(() => {
    if (!perfil && !aluno) return;
    if (carregadoDe.current === chaveDados) return;
    carregadoDe.current = chaveDados;
    setForm({
      nome: perfil?.nome ?? aluno?.nome ?? "",
      telefone: maskTelefone(perfil?.telefone ?? aluno?.telefone ?? ""),
      genero: (aluno as any)?.genero ?? "",
      email: aluno?.email ?? user?.email ?? "",
      endereco: (aluno as any)?.endereco ?? "",
      contato_emergencia: (aluno as any)?.contato_emergencia ?? "",
      observacoes: (aluno as any)?.observacoes ?? "",
    });
  }, [chaveDados, perfil, aluno, user?.email]);

  const { data: sensiveis } = useQuery({
    queryKey: ["meus-sensiveis", aluno?.id],
    enabled: Boolean(aluno?.id),
    queryFn: async () => {
      const { data } = await supabase
        .from("alunos_sensiveis")
        .select("data_nascimento")
        .eq("aluno_id", aluno!.id)
        .maybeSingle();
      return data ?? { data_nascimento: "" };
    },
  });
  const [nascimento, setNascimento] = useState<string | null>(null);
  const nascValue = nascimento ?? (sensiveis?.data_nascimento ?? "");

  const { data: optinRow } = useQuery({
    queryKey: ["meu-optin", aluno?.id],
    enabled: Boolean(aluno?.id),
    queryFn: async () => {
      const { data } = await supabase
        .from("alunos")
        .select("whatsapp_optin")
        .eq("id", aluno!.id)
        .maybeSingle();
      return data ?? { whatsapp_optin: true };
    },
  });
  const [optin, setOptin] = useState<boolean | null>(null);
  const optinValue = optin ?? optinRow?.whatsapp_optin ?? true;

  async function alterarOptin(valor: boolean) {
    if (!aluno?.id) return;
    setOptin(valor);
    const { error } = await supabase
      .from("alunos")
      .update({ whatsapp_optin: valor })
      .eq("id", aluno.id);
    if (error) {
      setOptin(!valor);
      toast.error("Não foi possível atualizar a preferência de WhatsApp.");
      return;
    }
    qc.invalidateQueries({ queryKey: ["meu-optin"] });
    toast.success(valor ? "WhatsApp ativado." : "WhatsApp desativado.");
  }

  const { data: fotoUrl } = useQuery({
    queryKey: ["avatar", perfil?.foto_url],
    queryFn: () => signedAvatar(perfil?.foto_url),
  });

  const { data: plano } = useQuery({
    queryKey: [...qk.planos, (aluno as any)?.plano_id],
    queryFn: () => fetchMeuPlano((aluno as any)?.plano_id),
    enabled: Boolean((aluno as any)?.plano_id),
  });

  const { data: reservas = [] } = useQuery({
    queryKey: [...qk.reservas, aluno?.id],
    queryFn: () => fetchMinhasReservas(aluno?.id),
    enabled: Boolean(aluno?.id),
  });

  function set(campo: string, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function enviarFoto(file: File) {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5 MB.");
      return;
    }
    setBusy(true);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
      upsert: true,
      contentType: file.type,
    });
    if (upErr) {
      setBusy(false);
      toast.error("Não foi possível enviar a foto.");
      return;
    }
    await supabase.from("profiles").update({ foto_url: path }).eq("id", user.id);
    if (aluno?.id) await supabase.from("alunos").update({ foto_url: path }).eq("id", aluno.id);
    setBusy(false);
    toast.success("Foto atualizada.");
    await refresh();
    qc.invalidateQueries({ queryKey: ["avatar"] });
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const erroTel = erroTelefone(form.telefone);
    if (erroTel) {
      toast.error(erroTel);
      return;
    }

    setBusy(true);

    const { error: e1 } = await supabase
      .from("profiles")
      .update({ nome: form.nome, telefone: form.telefone })
      .eq("id", user.id);

    let e2: unknown = null;
    if (aluno?.id) {
      const { error } = await supabase
        .from("alunos")
        .update({
          nome: form.nome,
          telefone: form.telefone,
          genero: form.genero || null,
          email: form.email,
          endereco: form.endereco,
          contato_emergencia: form.contato_emergencia,
          observacoes: form.observacoes,
        } as any)
        .eq("id", aluno.id);
      e2 = error;
    }

    let e3: unknown = null;
    if (aluno?.id && nascValue) {
      const { error } = await supabase.from("alunos_sensiveis").upsert(
        {
          aluno_id: aluno.id,
          data_nascimento: nascValue || null,
        },
        { onConflict: "aluno_id" } as any,
      );
      e3 = error;
    }

    setBusy(false);
    const falha = (e1 || e2 || e3) as any;
    if (falha) {
      console.error("Erro ao salvar perfil", { e1, e2, e3 });
      toast.error(falha?.message ?? "Não foi possível salvar todos os dados.");
      return;
    }
    toast.success("Perfil atualizado.");
    await refresh();
    qc.invalidateQueries({ queryKey: ["meus-sensiveis"] });
    qc.invalidateQueries({ queryKey: ["admin-alunos"] });
  }

  async function trocarSenha() {
    if (novaSenha.length < 6) {
      toast.error("A senha precisa ter ao menos 6 caracteres.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    if (error) {
      toast.error(error.message);
      return;
    }
    setNovaSenha("");
    toast.success("Senha alterada.");
  }

  async function sair() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const historico = (reservas as any[]).filter((r) => r.horarios);
  const usadasSemana = aulasNaSemana(reservas as any[]);
  const restantesSemana =
    plano?.limite_semanal != null ? Math.max(plano.limite_semanal - usadasSemana, 0) : null;

  return (
    <div className="space-y-6">
      <PageTitle eyebrow={tratamentoAluno(form.genero)} title="Perfil" />

      <section className="surface-panel flex items-center gap-4 px-5 py-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="group relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary/40 bg-surface-2"
          aria-label="Trocar foto de perfil"
        >
          {fotoUrl ? (
            <img src={fotoUrl} alt="Foto de perfil" className="size-full object-cover" />
          ) : (
            <span className="font-display text-2xl text-primary">
              {(perfil?.nome ?? "A").charAt(0).toUpperCase()}
            </span>
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-background/70 opacity-0 transition-opacity group-hover:opacity-100">
            <Camera className="size-5 text-primary" />
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) enviarFoto(f);
            e.target.value = "";
          }}
        />
        <div className="min-w-0">
          <p className="truncate font-display text-2xl text-foreground">{perfil?.nome}</p>
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-1 text-[11px] font-semibold text-primary"
          >
            Trocar foto
          </button>
        </div>
      </section>

      <form onSubmit={salvar} className="surface-panel space-y-4 px-5 py-4">
        <p className="eyebrow">Meus dados</p>

        <Campo id="p-nome" label="Nome completo">
          <Input
            id="p-nome"
            value={form.nome}
            onChange={(e) => set("nome", e.target.value)}
            maxLength={120}
          />
        </Campo>

        <Campo id="p-genero" label="Gênero">
          <div className="flex flex-wrap gap-2">
            {GENEROS.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => set("genero", form.genero === g.value ? "" : g.value)}
                aria-pressed={form.genero === g.value}
                className={
                  form.genero === g.value
                    ? "rounded-md border border-primary bg-primary/15 px-3 py-2 text-sm font-semibold text-primary"
                    : "rounded-md border border-border px-3 py-2 text-sm text-muted-foreground"
                }
              >
                {g.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Usado apenas para a forma de tratamento dentro do app.
          </p>
        </Campo>

        <Campo id="p-nasc" label="Data de nascimento">
          <Input
            id="p-nasc"
            type="date"
            value={nascValue ?? ""}
            onChange={(e) => setNascimento(e.target.value)}
          />
        </Campo>

        <Campo id="p-tel" label="Telefone">
          <Input
            id="p-tel"
            value={form.telefone ?? ""}
            onChange={(e) => set("telefone", maskTelefone(e.target.value))}
            placeholder="(99)99999-9999"
            inputMode="numeric"
            maxLength={14}
            aria-invalid={Boolean(erroTelefone(form.telefone))}
          />
          {erroTelefone(form.telefone) ? (
            <p className="text-[11px] leading-snug text-destructive">
              {erroTelefone(form.telefone)}
            </p>
          ) : null}

        </Campo>

        <Campo id="p-email" label="E-mail de contato">
          <Input
            id="p-email"
            type="email"
            value={form.email ?? ""}
            onChange={(e) => set("email", e.target.value)}
            maxLength={255}
          />
        </Campo>

        <Campo id="p-end" label="Endereço">
          <Input
            id="p-end"
            value={form.endereco ?? ""}
            onChange={(e) => set("endereco", e.target.value)}
            maxLength={255}
          />
        </Campo>

        <Campo id="p-emerg" label="Contato de emergência">
          <Input
            id="p-emerg"
            value={form.contato_emergencia ?? ""}
            onChange={(e) => set("contato_emergencia", e.target.value)}
            maxLength={255}
          />
        </Campo>

        <Campo id="p-obs" label="Observações">
          <Textarea
            id="p-obs"
            value={form.observacoes ?? ""}
            onChange={(e) => set("observacoes", e.target.value)}
            rows={3}
            maxLength={2000}
          />
        </Campo>

        <p className="text-[11px] text-muted-foreground">
          Sua data de nascimento fica protegida: só você e a administração do estúdio podem vê-la.
        </p>

        <Button type="submit" disabled={busy} className="w-full">
          Salvar alterações
        </Button>
      </form>

      <section className="surface-panel space-y-2 px-5 py-4">
        <p className="eyebrow">Meu plano</p>
        <p className="font-display text-2xl text-gold-gradient">
          {plano && (plano as any).ativo ? plano.nome : "Sem plano definido"}
        </p>
        {plano && (plano as any).ativo ? (
          <p className="text-xs text-muted-foreground">
            {plano.limite_semanal
              ? `${plano.limite_semanal} aula(s) por semana`
              : (plano as any).ilimitado === true
                ? "Aulas ilimitadas"
                : "Sem limite semanal definido"}
            {plano.preco_centavos ? ` · ${precoBRL(plano.preco_centavos)}/mês` : ""}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Fale com o estúdio para escolher seu plano.
          </p>
        )}
        <p className="text-sm text-foreground">
          {!plano || !(plano as any).ativo
            ? "0 aula(s) disponível(is) nesta semana"
            : restantesSemana != null
              ? `${restantesSemana} aula(s) restante(s) nesta semana`
              : `${usadasSemana} aula(s) reservada(s) nesta semana`}
        </p>
      </section>

      <section className="surface-panel space-y-3 px-5 py-4">
        <p className="eyebrow">Comunicação</p>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="p-whatsapp">Receber confirmações e lembretes pelo WhatsApp</Label>
            <p className="text-[11px] text-muted-foreground">
              O envio continua sendo feito pelo bot apenas quando houver reservas.
            </p>
          </div>
          <Switch
            id="p-whatsapp"
            checked={optinValue}
            onCheckedChange={alterarOptin}
            disabled={!aluno?.id}
          />
        </div>
      </section>

      <section className="surface-panel space-y-3 px-5 py-4">
        <p className="eyebrow">Segurança</p>
        <Campo id="p-senha" label="Nova senha">
          <Input
            id="p-senha"
            type="password"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            placeholder="••••••••"
          />
        </Campo>
        <Button variant="outline" className="w-full" onClick={trocarSenha}>
          <KeyRound className="size-4" /> Alterar senha
        </Button>
      </section>

      <section>
        <p className="eyebrow mb-2">Histórico de aulas</p>
        {historico.length === 0 ? (
          <EmptyState>Você ainda não reservou aulas.</EmptyState>
        ) : (
          <div className="space-y-2">
            {historico.map((r) => (
              <div
                key={r.id}
                className="surface-panel flex items-center justify-between px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {r.horarios.modalidades?.nome ?? "Aula"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateLong(r.horarios.data)} · {formatHora(r.horarios.horario)}
                  </p>
                </div>
                <span
                  className={
                    r.status === "confirmada"
                      ? "text-xs font-semibold text-primary"
                      : "text-xs text-muted-foreground"
                  }
                >
                  {r.status === "confirmada" ? "Confirmada" : "Cancelada"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <Button variant="ghost" className="w-full text-destructive" onClick={sair}>
        <LogOut className="size-4" /> Sair da conta
      </Button>
    </div>
  );
}

function Campo({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
