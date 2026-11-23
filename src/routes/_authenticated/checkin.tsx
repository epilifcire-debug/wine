import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Clock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { fazerCheckin, fetchMinhasReservas, janelaCheckin, qk } from "@/lib/queries";
import { formatDateLong, formatHora } from "@/lib/format";
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
import { EmptyState, PageTitle } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/checkin")({
  component: CheckinPage,
  head: () => ({
    meta: [
      { title: "Check-in de aulas — Wine Barbell Club" },
      {
        name: "description",
        content: "Confirme sua presença nas aulas reservadas do Wine Barbell Club.",
      },
      { property: "og:title", content: "Check-in de aulas — Wine Barbell Club" },
      { property: "og:description", content: "Confirme sua presença nas aulas reservadas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function CheckinPage() {
  const { aluno } = useAuth();
  const qc = useQueryClient();

  const { data: reservas = [], isLoading } = useQuery({
    queryKey: [...qk.reservas, "checkin", aluno?.id],
    queryFn: () => fetchMinhasReservas(aluno?.id),
    enabled: Boolean(aluno?.id),
  });

  const checkin = useMutation({
    mutationFn: (id: string) => fazerCheckin(id),
    onSuccess: () => {
      toast.success("Presença confirmada!");
      qc.invalidateQueries({ queryKey: qk.reservas });
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível fazer o check-in."),
  });

  const ativas = (reservas as any[]).filter((r) => r.status === "confirmada" && r.horarios);

  return (
    <>
      <PageTitle eyebrow="Presença" title="Check-in" />
      {isLoading ? (
        <EmptyState>Carregando suas aulas…</EmptyState>
      ) : ativas.length === 0 ? (
        <EmptyState>Você não possui reservas confirmadas.</EmptyState>
      ) : (
        <div className="space-y-3">
          {ativas.map((r) => {
            const h = r.horarios;
            const janela = janelaCheckin(h.data, h.horario);
            const feito = Boolean(r.checkin_em);
            return (
              <div key={r.id} className="surface-panel px-4 py-4">
                <p className="eyebrow">{h.modalidades?.nome ?? "Aula"}</p>
                <h2 className="font-display text-xl text-foreground">
                  {formatDateLong(h.data)} · {formatHora(h.horario)}
                </h2>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="size-3.5" /> Check-in liberado de 3h antes até 1h após o início.
                </p>

                <div className="mt-3">
                  {feito ? (
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                      <CheckCircle2 className="size-4" /> Presença confirmada
                    </p>
                  ) : janela === "cedo" ? (
                    <Button disabled variant="secondary" className="w-full">
                      Ainda não liberado
                    </Button>
                  ) : janela === "encerrada" ? (
                    <Button disabled variant="secondary" className="w-full">
                      Janela encerrada
                    </Button>
                  ) : (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button className="w-full">Fazer check-in</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar presença?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Você confirmará sua presença na aula de{" "}
                            {h.modalidades?.nome ?? "treino"} em {formatDateLong(h.data)} às{" "}
                            {formatHora(h.horario)}.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Voltar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => checkin.mutate(r.id)}>
                            Confirmar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
