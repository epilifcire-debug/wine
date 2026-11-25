import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { redefinirSenhaUsuario } from "@/lib/admin-users.functions";
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
} from "@/components/ui/alert-dialog";

/** Admin gera uma senha provisória para a conta e repassa à pessoa. */
export function RedefinirSenhaButton({
  userId,
  nome,
  variante = "icone",
}: {
  userId: string;
  nome: string;
  variante?: "icone" | "texto";
}) {
  const redefinir = useServerFn(redefinirSenhaUsuario);
  const [aberto, setAberto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [senha, setSenha] = useState<string | null>(null);

  async function confirmar() {
    setBusy(true);
    try {
      const r = await redefinir({ data: { userId } });
      setSenha(r.senha);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível redefinir a senha.");
      setAberto(false);
    } finally {
      setBusy(false);
    }
  }

  function fechar(o: boolean) {
    setAberto(o);
    if (!o) setSenha(null);
  }

  return (
    <>
      {variante === "icone" ? (
        <Button size="icon" variant="ghost" aria-label={`Redefinir senha de ${nome}`} title="Redefinir senha" onClick={() => setAberto(true)}>
          <KeyRound className="size-4" />
        </Button>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setAberto(true)}>
          <KeyRound className="size-4" /> Redefinir senha
        </Button>
      )}

      <AlertDialog open={aberto} onOpenChange={fechar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{senha ? "Senha provisória criada" : `Redefinir a senha de ${nome}?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {senha
                ? "Repasse esta senha à pessoa. Ela não será mostrada de novo; peça para trocar no Perfil depois de entrar."
                : "A senha atual deixa de funcionar e uma senha provisória é gerada."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {senha && (
            <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-3">
              <code className="font-mono text-lg tracking-wider text-foreground">{senha}</code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard?.writeText(senha).then(
                    () => toast.success("Senha copiada."),
                    () => toast.error("Não foi possível copiar."),
                  );
                }}
              >
                Copiar
              </Button>
            </div>
          )}
          <AlertDialogFooter>
            {senha ? (
              <AlertDialogAction onClick={() => fechar(false)}>Concluir</AlertDialogAction>
            ) : (
              <>
                <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
                <Button onClick={confirmar} disabled={busy}>
                  {busy ? "Gerando…" : "Gerar senha provisória"}
                </Button>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
