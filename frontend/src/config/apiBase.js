/**
 * Base URL da API no navegador.
 * Prioridade: `import.meta.env.VITE_API_URL` (ex.: https://backend.onrender.com/api).
 * Sem VITE em dev: http://localhost:3333/api. Sem VITE em prod: /api (proxy Vercel).
 *
 * Uso: `import { API } from "./config/apiBase"` e `fetch(\`${API}/rota\`)` ou axios com baseURL: API.
 */
function normalizeTrailingSlash(raw) {
  return raw.replace(/\/$/, "");
}

/**
 * LAN comum: usuario cola http://IP/api sem :3333 (cai na porta 80 e falha).
 * Em desenvolvimento, assume backend na porta padrao 3333 apenas para path /api.
 */
function tryFixLanHttpApiWithoutPort(urlString) {
  if (!import.meta.env.DEV) return urlString;
  let trimmed = normalizeTrailingSlash(urlString.trim());
  try {
    const parsed = new URL(trimmed);
    const ipv4 =
      /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.test(parsed.hostname);
    const noExplicitPort =
      parsed.port === "" || parsed.port === "80";
    const pathOk =
      normalizeTrailingSlash(parsed.pathname) === "/api";
    if (
      parsed.protocol === "http:" &&
      ipv4 &&
      noExplicitPort &&
      pathOk
    ) {
      console.warn(
        "[Maricota] VITE_API_URL sem porta (:3333) na LAN. Corrigido para http://" +
          parsed.hostname +
          ":3333/api — ajuste em frontend/.env."
      );
      return `http://${parsed.hostname}:3333/api`;
    }
  } catch {
    /* ignora URLs invalidas */
  }
  return trimmed;
}

export const API = (() => {
  const fromEnv = import.meta.env.VITE_API_URL?.trim();
  if (fromEnv) return tryFixLanHttpApiWithoutPort(fromEnv);
  if (import.meta.env.PROD) return "/api";
  return "http://localhost:3333/api";
})();

export function getApiBaseUrl() {
  return API;
}
