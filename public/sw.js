/* Service worker do Wine Barbell Club.
 * Guarda só arquivos estáticos versionados (JS/CSS/fontes/ícones).
 * Dados de aluno, reservas, pagamentos e chamadas ao servidor/Supabase
 * nunca são cacheados. A versão vem do registro: /sw.js?v=<versão do app>.
 */
const VERSAO = new URL(self.location.href).searchParams.get("v") || "dev";
const CACHE = `wbc-static-${VERSAO}`;
const PRECACHE = ["/offline.html", "/icons/icon-192.png", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  // Não ativa sozinho: espera o usuário tocar em "Atualizar".
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nomes) =>
        Promise.all(
          nomes.filter((n) => n.startsWith("wbc-static-") && n !== CACHE).map((n) => caches.delete(n)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

function ehEstatico(url) {
  return (
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(?:woff2?|ttf|otf)$/.test(url.pathname) ||
    url.pathname === "/logo.png" ||
    url.pathname === "/favicon.png"
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase e terceiros: direto na rede.

  // Páginas: sempre da rede; sem conexão, mostra a página offline.
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match("/offline.html")));
    return;
  }

  // Arquivos estáticos com hash: cache primeiro.
  if (ehEstatico(url)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok && res.type === "basic") {
              const copia = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copia));
            }
            return res;
          }),
      ),
    );
  }
  // Demais (server functions, APIs): sem interceptar.
});
