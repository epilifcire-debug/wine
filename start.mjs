// Início do app na Shard Cloud (ou em qualquer Node).
// Gera o build de servidor Node se ainda não existir e liga o servidor.
// As variáveis VITE_* do painel entram no build aqui, na hora da execução.
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const SERVIDOR = ".output/server/index.mjs";
const forcar = process.env.FORCE_BUILD === "1";

if (forcar || !existsSync(SERVIDOR)) {
  console.log("[start] gerando build de produção…");
  const r = spawnSync("npx", ["vite", "build"], {
    stdio: "inherit",
    env: { ...process.env, NITRO_PRESET: "node-server", NODE_ENV: "production" },
    shell: process.platform === "win32",
  });
  if (r.status !== 0) {
    console.error("[start] build falhou");
    process.exit(r.status ?? 1);
  }
}

process.env.HOST ??= "0.0.0.0";
process.env.PORT ??= "8080";
console.log(`[start] servidor na porta ${process.env.PORT}`);
await import(`./${SERVIDOR}`);
