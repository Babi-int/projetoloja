import { useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { isAuthenticated, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!email || !password) {
        setError("Preencha o e-mail e a senha.");
        return;
      }
      setLoading(true);
      setError("");
      try {
        await login(email, password);
      } catch (err) {
        const isNetwork =
          !err.response &&
          (err.code === "ERR_NETWORK" || err.message === "Network Error");
        const isTimeout = err.code === "ECONNABORTED";
        const apiMsg = err.response?.data?.message;
        if (isNetwork || isTimeout) {
          setError(
            "Não foi possível conectar ao servidor. O sistema pode estar sendo iniciado — aguarde 30 segundos e tente novamente."
          );
        } else {
          setError(apiMsg || "E-mail ou senha incorretos.");
        }
      } finally {
        setLoading(false);
      }
    },
    [email, password, login]
  );

  if (isAuthenticated) return <Navigate to="/" replace />;

  return (
    <main className="grid min-h-screen place-items-center p-4">
      <div className="card w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-6 flex justify-center rounded-2xl bg-white/80 p-4 ring-1 ring-pink-100">
            <BrandLogo />
          </div>
          <h1 className="text-2xl font-black text-maricota-text">Bem-vindo</h1>
          <p className="mt-1 text-sm text-slate-500">Faça login para continuar</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              E-mail
            </label>
            <input
              type="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@maricotakids.com"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-maricota-pink focus:ring-2 focus:ring-maricota-pink/20"
              disabled={loading}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Senha
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-maricota-pink focus:ring-2 focus:ring-maricota-pink/20"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
