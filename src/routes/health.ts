import { createFileRoute } from "@tanstack/react-router";

/** Health check leve para a Shard Cloud (sem chamadas externas). */
export const Route = createFileRoute("/health")({
  server: {
    handlers: {
      GET: async () =>
        new Response(
          JSON.stringify({ ok: true, versao: __APP_VERSION__, commit: __APP_COMMIT__ }),
          { headers: { "content-type": "application/json", "cache-control": "no-store" } },
        ),
    },
  },
});
