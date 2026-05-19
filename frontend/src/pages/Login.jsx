import { useCallback, useEffect } from "react";
import { Navigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import { useAuth } from "../context/AuthContext";
import { API } from "../config/apiBase";

/** Build de producao com API em localhost — no site publico (ex.: Vercel) o navegador do visitante nao alcanca seu PC. */
const PROD_API_MISCONFIGURED =
  import.meta.env.PROD && /localhost|127\.0\.0\.1/i.test(API);

export default function Login() {
  const { isAuthenticated, enterWithoutPassword } = useAuth();

  const proceed = useCallback(() => {
    enterWithoutPassword();
  }, [enterWithoutPassword]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key !== "Enter") return;
      const tag = (event.target && event.target.tagName) || "";
      if (tag === "TEXTAREA") return;
      event.preventDefault();
      proceed();
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
            botao abaixo. A API deve estar com <code className="text-xs">AUTH_DISABLED=true</code> (sem verificacao de
            senha no servidor).
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

        <button className="btn-primary w-full" type="button" onClick={proceed}>
          Entrar
        </button>
      </div>
    </main>
  );
}
