import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";
import logo from "@/assets/wine-barbell-logo.png.asset.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Entrar — Wine Barbell Club" },
      {
        name: "description",
        content: "Acesse sua conta do Wine Barbell Club para agendar suas aulas.",
      },
      { property: "og:title", content: "Entrar — Wine Barbell Club" },
      { property: "og:description", content: "Acesse sua conta do Wine Barbell Club." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Mode = "login" | "signup" | "reset";

function AuthPage() {
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [busy, setBusy] = useState(false);
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    if (!authLoading && session) navigate({ to: "/app", replace: true });
  }, [authLoading, session, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
        navigate({ to: "/app", replace: true });
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: {
            emailRedirectTo: window.location.origin,
            data: { nome },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setEnviado(true);
          toast.success("Confira seu e-mail para confirmar o cadastro.");
        } else {
          navigate({ to: "/app", replace: true });
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setEnviado(true);
        toast.success("Enviamos um link de recuperação para seu e-mail.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro inesperado";
      toast.error(
        msg.includes("Invalid login")
          ? "E-mail ou senha incorretos."
          : msg.includes("already registered")
            ? "Este e-mail já está cadastrado."
            : msg,
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Não foi possível entrar com o Google.");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/app", replace: true });
  }

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-6 py-10"
      style={{ backgroundColor: "#000000" }}
    >
      <div className="w-full max-w-sm">
        <img
          src={logo.url}
          alt="Wine Barbell Club"
          className="mx-auto w-44"
          width={512}
          height={768}
        />

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Acesse sua conta
        </p>

        {enviado ? (
          <div className="mt-8 rounded-xl border border-border bg-surface p-5 text-center">
            <p className="text-sm text-foreground">
              Verifique sua caixa de entrada em <strong>{email}</strong>.
            </p>
            <Button
              variant="ghost"
              className="mt-4 w-full"
              onClick={() => {
                setEnviado(false);
                setMode("login");
              }}
            >
              Voltar para o login
            </Button>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label htmlFor="nome">Nome completo</Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                    maxLength={120}
                    placeholder="Seu nome"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  maxLength={255}
                  placeholder="voce@email.com"
                />
              </div>
              {mode !== "reset" && (
                <div className="space-y-1.5">
                  <Label htmlFor="senha">Senha</Label>
                  <Input
                    id="senha"
                    type="password"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                    minLength={6}
                    placeholder="••••••••"
                  />
                </div>
              )}
              <Button type="submit" className="w-full" size="lg" disabled={busy}>
                {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
                {mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Enviar link"}
              </Button>
            </form>

            {mode !== "reset" && (
              <>
                <div className="my-5 flex items-center gap-3">
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                    ou
                  </span>
                  <span className="h-px flex-1 bg-border" />
                </div>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={handleGoogle}
                  disabled={busy}
                >
                  <GoogleIcon />
                  Entrar com Google
                </Button>
              </>
            )}

            <div className="mt-6 space-y-2 text-center text-sm">
              {mode === "login" && (
                <>
                  <button
                    type="button"
                    className="text-muted-foreground underline-offset-4 hover:underline"
                    onClick={() => setMode("reset")}
                  >
                    Esqueci minha senha
                  </button>
                  <p className="text-muted-foreground">
                    Não tem conta?{" "}
                    <button
                      type="button"
                      className="font-semibold text-primary"
                      onClick={() => setMode("signup")}
                    >
                      Criar agora
                    </button>
                  </p>
                </>
              )}
              {mode !== "login" && (
                <button
                  type="button"
                  className="text-muted-foreground underline-offset-4 hover:underline"
                  onClick={() => setMode("login")}
                >
                  Voltar para o login
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24Z"
      />
      <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path
        fill="#EA4335"
        d="M12 4.7c1.8 0 3.3.6 4.5 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0A12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.7 12 4.7Z"
      />
    </svg>
  );
}
