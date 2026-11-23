import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import logo from "@/assets/wine-barbell-logo.png.asset.json";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Wine Barbell Club — LPO e Treino Híbrido" },
      {
        name: "description",
        content:
          "App do Wine Barbell Club: agende aulas de LPO e híbrido, acompanhe o WOD do dia e reserve seu horário.",
      },
      { property: "og:title", content: "Wine Barbell Club — LPO e Treino Híbrido" },
      {
        property: "og:description",
        content: "App do Wine Barbell Club: agende aulas de LPO e híbrido, acompanhe o WOD do dia e reserve seu horário.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Index() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    navigate({ to: session ? "/app" : "/auth", replace: true });
  }, [loading, session, navigate]);

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-6 px-6"
      style={{ backgroundColor: "#000000" }}
    >
      <img
        src={logo.url}
        alt="Wine Barbell Club"
        className="w-56 max-w-[70vw] animate-pulse"
        width={512}
        height={768}
      />
      <h1 className="sr-only">Wine Barbell Club</h1>
      <p className="eyebrow">Carregando…</p>
    </main>
  );
}
