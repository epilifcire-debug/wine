import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { AdminGuard } from "@/components/AdminGuard";
import { EmptyState, PageTitle } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/admin/whatsapp")({
  component: () => (
    <AdminGuard>
      <WhatsappBot />
    </AdminGuard>
  ),
  head: () => ({ meta: [{ title: "WhatsApp do bot — Wine Barbell Club" }] }),
});

type Status = {
  estado: "desconhecido" | "conectado" | "desconectado" | "aguardando_qr";
  qr: string | null;
  numero: string | null;
  atualizado_em: string;
};

const ROTULO: Record<Status["estado"], string> = {
  conectado: "Conectado",
  desconectado: "Desconectado",
  aguardando_qr: "Aguardando leitura do QR Code",
  desconhecido: "Sem notícias do bot",
};

function WhatsappBot() {
  const { isAdminMaster, loading } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["whatsapp-bot-status"],
    enabled: isAdminMaster,
    refetchInterval: 4000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_bot_status" as never)
        .select("estado, qr, numero, atualizado_em")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data as Status | null;
    },
  });

  const [imagem, setImagem] = useState<string | null>(null);
  useEffect(() => {
    if (data?.estado !== "aguardando_qr" || !data.qr) {
      setImagem(null);
      return;
    }
    QRCode.toDataURL(data.qr, { margin: 1, width: 280 }).then(setImagem, () => setImagem(null));
  }, [data?.estado, data?.qr]);

  if (loading) return <EmptyState>Verificando permissões…</EmptyState>;
  if (!isAdminMaster) return <EmptyState>Esta área é exclusiva do Administrador Master.</EmptyState>;

  // Sem atualização há mais de 3 minutos: o bot pode estar parado.
  const semSinal = data ? Date.now() - new Date(data.atualizado_em).getTime() > 3 * 60 * 1000 : true;

  return (
    <div className="space-y-4">
      <PageTitle eyebrow="Administração Master" title="WhatsApp do bot" />
      {isLoading ? (
        <EmptyState>Carregando…</EmptyState>
      ) : (
        <section className="surface-panel space-y-4 px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Situação</p>
              <p className={`font-display text-2xl ${data?.estado === "conectado" ? "text-primary" : "text-foreground"}`}>
                {ROTULO[data?.estado ?? "desconhecido"]}
              </p>
              {data?.numero && <p className="text-sm text-muted-foreground">Número: {data.numero}</p>}
            </div>
            {data && (
              <p className="text-xs text-muted-foreground">
                Atualizado em {new Date(data.atualizado_em).toLocaleString("pt-BR")}
                {semSinal && data.estado !== "desconhecido" ? " · sem sinal recente do bot" : ""}
              </p>
            )}
          </div>

          {data?.estado === "aguardando_qr" && (
            <div className="flex flex-col items-center gap-3 border-t border-border pt-4 text-center">
              {imagem ? (
                <img src={imagem} alt="QR Code para conectar o WhatsApp do bot" className="size-64 rounded-md bg-white p-2" />
              ) : (
                <p className="text-sm text-muted-foreground">Aguardando o QR Code…</p>
              )}
              <p className="max-w-sm text-sm text-muted-foreground">
                No celular do número do Wine: WhatsApp → Aparelhos conectados → Conectar um aparelho, e leia o código.
                Ele se renova sozinho a cada poucos segundos.
              </p>
            </div>
          )}

          {data?.estado === "conectado" && (
            <p className="border-t border-border pt-4 text-sm text-muted-foreground">
              O bot está enviando as confirmações de reserva normalmente.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
