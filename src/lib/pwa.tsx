import { useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";

/* ───────────── Instalação ───────────── */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let promptGuardado: BeforeInstallPromptEvent | null = null;
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((f) => f());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    promptGuardado = e as BeforeInstallPromptEvent;
    avisar();
  });
  window.addEventListener("appinstalled", () => {
    promptGuardado = null;
    avisar();
  });
}

function emModoApp() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function ehIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/** Estado da instalação: só oferece quando o navegador permite. */
export function useInstalarApp() {
  const disponivel = useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => Boolean(promptGuardado),
    () => false,
  );
  const instalado = typeof window !== "undefined" && emModoApp();

  async function instalar() {
    if (!promptGuardado) return;
    await promptGuardado.prompt();
    await promptGuardado.userChoice;
    promptGuardado = null;
    avisar();
  }

  return {
    instalado,
    podeInstalar: disponivel && !instalado,
    /** iPhone não tem botão de instalar: mostra a instrução do Safari. */
    mostrarDicaIOS: !instalado && ehIOS(),
    instalar,
  };
}

/* ───────────── Service worker e atualização ───────────── */

/** Registra o service worker (só em produção) e avisa quando há versão nova. */
export function PwaManager() {
  useEffect(() => {
    if (import.meta.env.DEV || !("serviceWorker" in navigator)) return;

    let recarregando = false;
    const aoTrocar = () => {
      if (recarregando) return;
      recarregando = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", aoTrocar);

    const oferecer = (sw: ServiceWorker) => {
      toast("Nova versão do app disponível", {
        description: "Atualize quando terminar o que está fazendo.",
        duration: Infinity,
        action: { label: "Atualizar", onClick: () => sw.postMessage("SKIP_WAITING") },
      });
    };

    navigator.serviceWorker
      .register(`/sw.js?v=${encodeURIComponent(__APP_VERSION__)}`, { scope: "/" })
      .then((reg) => {
        // Já havia uma versão esperando (aberta em outra aba, por exemplo).
        if (reg.waiting && navigator.serviceWorker.controller) oferecer(reg.waiting);
        reg.addEventListener("updatefound", () => {
          const novo = reg.installing;
          novo?.addEventListener("statechange", () => {
            if (novo.state === "installed" && navigator.serviceWorker.controller) oferecer(novo);
          });
        });
        // Confere de tempos em tempos (app aberto por muito tempo).
        const timer = window.setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
        return () => window.clearInterval(timer);
      })
      .catch((err) => console.warn("Service worker não registrado:", err));

    return () => navigator.serviceWorker.removeEventListener("controllerchange", aoTrocar);
  }, []);

  return null;
}
