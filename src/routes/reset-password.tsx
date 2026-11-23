import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
  head: () => ({
    meta: [
      { title: "Nova senha — Wine Barbell Club" },
      { name: "description", content: "Defina uma nova senha para sua conta do Wine Barbell Club." },
      { property: "og:title", content: "Nova senha — Wine Barbell Club" },
      { property: "og:description", content: "Defina uma nova senha para sua conta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ResetPassword() {
  const [senha, setSenha] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Senha alterada com sucesso.");
    navigate({ to: "/app", replace: true });
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center px-6"
      style={{ backgroundColor: "#000000" }}
    >
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-center font-display text-3xl text-gold-gradient">Nova senha</h1>
        <div className="space-y-1.5">
          <Label htmlFor="senha">Digite a nova senha</Label>
          <Input
            id="senha"
            type="password"
            minLength={6}
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={busy}>
          Salvar nova senha
        </Button>
      </form>
    </main>
  );
}
