import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Somente teste local (npm run dev com VITE_PREVIEW_BYPASS=1). Nunca vale em produção.
    if (import.meta.env.DEV && import.meta.env.VITE_PREVIEW_BYPASS === "1") {
      return { user: { id: "preview" } as never };
    }
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
