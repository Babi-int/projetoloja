import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import { useAuth } from "../context/AuthContext";
import { API } from "../config/apiBase";

function isLocalApiUrl() {
  return /localhost|127\.0\.0\.1/i.test(API);
}

/** API publica (HTTPS), nao o PC local. */
function isRemoteHostedApi() {
  return /^https:\/\//i.test(API) && !isLocalApiUrl();
}

/** Build de producao com API em localhost — no site publico (ex.: Vercel) o navegador do visitante nao alcanca seu PC. */
const PROD_API_MISCONFIGURED =
  import.meta.env.PROD && /localhost|127\.0\.0\.1/i.test(API);

function getRemoteApiNetworkHelp() {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const apiBase = API.replace(/\/$/, "");
  const host = apiBase.replace(/\/api\/?$/i, "");
  const healthApi = `${apiBase}/health`;
  const healthRoot = `${host}/health`;
  return [
    `Nao foi possivel conectar a API em ${API}.`,
    "",
    "O painel esta aberto no seu navegador, mas a chamada a API nao chegou ao servidor (ou demorou demais).",
    "",
    "1) Render (plano gratuito): o servico dorme. O primeiro acesso pode levar 1-2 minutos. Tente de novo apos esperar.",
    `2) Teste no navegador (nova aba): ${healthApi} ou ${healthRoot} — deve aparecer JSON com "status":"ok". Se nao abrir, o problema e no deploy/host.`,
    "3) CORS: no backend na Render, defina FRONTEND_URL com a origem deste site, por exemplo:",
    `   ${origin || "http://localhost:5173"}`,
    "   Se usar mais de um link (localhost + Vercel + IP na rede), separe por virgula, sem espacos.",
    "4) No Render → Logs: veja se o servico sobe sem erro (Firebase, JWT_SECRET, etc.)."
  ].join("\n");
}

function getNetworkErrorMessage() {
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  const runningOnDevMachine =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host.endsWith(".local") ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host);

  const builtWithLocalhostApi = isLocalApiUrl();

  if (runningOnDevMachine && isRemoteHostedApi()) {
    return getRemoteApiNetworkHelp();
  }

  if (runningOnDevMachine) {
    const lanHint =
      /^192\.168\.|^10\./.test(host) && builtWithLocalhostApi
        ? [
            "",
            "Voce abriu o painel pelo IP da rede (ex.: celular). Com VITE_API_URL em localhost, o navegador tenta a API no proprio aparelho — nao funciona.",
            "No frontend/.env use o IP do computador onde o backend esta rodando, ex.: VITE_API_URL=\"http://192.168.0.10:3333/api\". Reinicie o npm run dev do frontend."
          ].join("\n")
        : "";

    const apiBase = API.replace(/\/$/, "");
    const hostNoApi = apiBase.replace(/\/api\/?$/i, "");
    const healthApi = `${apiBase}/health`;
    const healthRoot = `${hostNoApi}/health`;
    const thisOrigin =
      typeof window !== "undefined" ? window.location.origin : "http://localhost:5173";

    return [
      `Nao foi possivel conectar a API em ${API}.`,
      "",
      "1) Teste a API (nova aba): " + healthApi + " ou " + healthRoot + " — se aparecer JSON com \"status\":\"ok\", o backend esta rodando.",
      "2) Backend parado: na raiz do projeto rode npm run dev:backend (ou: cd backend e npm run dev). Porta padrao 3333.",
      "3) Backend ok mas o navegador bloqueia (CORS): no backend/.env, FRONTEND_URL deve incluir a origem deste painel, por exemplo:",
      "   " + thisOrigin,
      "   Varias origens: separadas por virgula, sem espacos. Reinicie o backend apos editar.",
      "",
      "4) Apos mudar frontend/.env, pare e rode de novo npm run dev no frontend.",
      lanHint
    ]
      .filter(Boolean)
      .join("\n");
  }

  const lines = [
    `Nao foi possivel conectar a API (${API}).`,
    "",
    "Site publicado (ex.: Vercel): defina VERCEL_BACKEND_URL (URL do backend sem /api) no Edge ou VITE_API_URL=https://.../api no build. Redeploy apos mudar env. Com VITE absoluto, na API use FRONTEND_URL = origem exata deste site.",
    "No servidor da API: defina FRONTEND_URL com a URL exata do site (sem barra no final) para o CORS liberar o navegador."
  ];

  if (builtWithLocalhostApi) {
    lines.push(
      "",
      "Aviso: este site parece ter sido gerado com VITE_API_URL apontando para localhost. Em producao precisa da URL real da API no build."
    );
  }

  return lines.join("\n");
}

/** Mensagem do backend em varios formatos + fallbacks por status HTTP. */
function getApiErrorMessage(err) {
  if (err.code === "ECONNABORTED") {
    return "Tempo esgotado ao contatar a API. No Render gratuito o servico pode estar iniciando: espere ~1-2 min e tente de novo.";
  }
  const data = err.response?.data;
  if (typeof data === "string" && data.trim()) {
    const t = data.trim();
    if (!t.startsWith("<")) return t;
  }
  if (data && typeof data === "object" && data.message) return String(data.message);
  if (data && typeof data === "object" && data.error) {
    return typeof data.error === "string" ? data.error : String(data.error?.message || "");
  }
  const status = err.response?.status;
  if (status === 401) {
    return "Nao foi possivel entrar automaticamente. Rode o seed no backend (npm run seed) ou confira usuario admin no banco.";
  }
  if (status === 403) {
    return "Acesso negado. Se a API esta na Render, confira FRONTEND_URL com a URL exata deste site (CORS).";
  }
  if (status === 404) {
    return "Rota de autenticacao nao encontrada. Verifique VITE_API_URL (deve terminar em /api, sem barra duplicada).";
  }
  if (status === 400) {
    return "Dados invalidos enviados ao servidor.";
  }
  if (status === 500) {
    return "Erro no servidor. Veja os Logs no Render (Firebase, JWT_SECRET, etc.).";
  }
  if (status === 502 || status === 503 || status === 504) {
    return "API indisponivel ou reiniciando (HTTP " + status + "). No Render gratuito espere ~1-2 min e tente de novo.";
  }
  if (status) {
    return `O servidor respondeu com erro HTTP ${status}. Abra os Logs da API ou teste ${API.replace(/\/$/, "")}/health no navegador.`;
  }
  return "";
}

function getEnterFallbackMessage(err) {
  const parts = [];
  const status = err.response?.status;
  const code = err.code ? ` (${String(err.code)})` : "";
  if (status) parts.push(`HTTP ${status}`);
  if (err.message && err.message !== "Network Error") parts.push(err.message);
  const tail = parts.length ? ` Detalhe: ${parts.join(" — ")}${code}.` : "";
  return (
    "Nao foi possivel entrar." +
    tail +
    "\n\nSe o site e a Vercel: VERCEL_BACKEND_URL (Edge) ou VITE_API_URL no build; com chamadas diretas confira FRONTEND_URL na API. Teste: " +
    API.replace(/\/$/, "") +
    "/health"
  );
}

export default function Login() {
  const { isAuthenticated, enterWithDefaultCredentials } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);

  const proceed = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setError("");
    setLoading(true);
    try {
      await enterWithDefaultCredentials();
    } catch (err) {
      const apiMsg = getApiErrorMessage(err);
      if (apiMsg) {
        setError(apiMsg);
      } else if (err.code === "ERR_NETWORK" || err.message === "Network Error") {
        setError(getNetworkErrorMessage());
      } else if (err.request && !err.response) {
        setError(
          "Sem resposta da API (rede, CORS ou servidor offline).\n\n" + getNetworkErrorMessage()
        );
      } else {
        setError(getEnterFallbackMessage(err));
      }
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [enterWithDefaultCredentials]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key !== "Enter") return;
      const tag = (event.target && event.target.tagName) || "";
      if (tag === "TEXTAREA") return;
      event.preventDefault();
      void proceed();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [proceed]);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="grid min-h-screen place-items-center p-4">
      <div className="card w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-6 flex justify-center rounded-2xl bg-white/80 p-4 ring-1 ring-pink-100">
            <BrandLogo />
          </div>
          <h1 className="text-2xl font-black text-maricota-text">Bem-vindo</h1>
          <p className="mt-2 text-sm text-slate-500">
            Pressione <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">Enter</kbd> ou use o
            botao abaixo para abrir o painel.
          </p>
        </div>

        {PROD_API_MISCONFIGURED && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="font-bold">O site online nao esta apontando para a API publica.</p>
            <p className="mt-2 text-amber-900/95">
              Na <strong>Vercel</strong> (Project → Settings → Environment Variables), use <strong>uma</strong> das
              opcoes e depois faca um <strong>novo deploy</strong> (variaveis de build precisam de rebuild):
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-amber-900/95">
              <li>
                <code className="rounded bg-white/80 px-1">VERCEL_BACKEND_URL</code> = URL do backend{" "}
                <strong>sem</strong> <code className="rounded bg-white/80 px-1">/api</code>, ex.{" "}
                <code className="rounded bg-white/80 px-1">https://seu-app.onrender.com</code> — disponivel no{" "}
                <strong>Edge Middleware</strong>; o site encaminha <code className="rounded bg-white/80 px-1">/api</code>{" "}
                para a API (nao precisa de <code className="rounded bg-white/80 px-1">VITE_API_URL</code> nem CORS para
                esse caminho).
              </li>
              <li>
                Ou <code className="rounded bg-white/80 px-1">VITE_API_URL</code> ={" "}
                <code className="rounded bg-white/80 px-1">https://seu-app.onrender.com/api</code> — chamadas diretas;
                ao servidor da API defina <code className="rounded bg-white/80 px-1">FRONTEND_URL</code> como esta
                origem (sem barra no final), ex.{" "}
                <code className="rounded bg-white/80 px-1">
                  {typeof window !== "undefined" ? window.location.origin : "https://seu-projeto.vercel.app"}
                </code>
                .
              </li>
            </ul>
          </div>
        )}

        {error && (
          <div className="mb-4 whitespace-pre-line rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        <button className="btn-primary w-full" disabled={loading} type="button" onClick={() => void proceed()}>
          {loading ? "Abrindo..." : "Entrar"}
        </button>
      </div>
    </main>
  );
}
