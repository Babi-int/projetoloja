import { createContext, useContext, useMemo, useState } from "react";
import api from "../api/client";

/** Mesmo usuario criado por `npm run seed` no backend — necessario para obter JWT nas requisicoes. */
const DEFAULT_LOGIN_EMAIL = "admin@maricotakids.com";
const DEFAULT_LOGIN_PASSWORD = "admin123";

/** Estado de sessão: token + user no localStorage; rotas privadas leem isAuthenticated. */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("@maricota:user");
    return stored ? JSON.parse(stored) : null;
  });

  async function login(email, password) {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("@maricota:token", data.token);
    localStorage.setItem("@maricota:user", JSON.stringify(data.user));
    setUser(data.user);
  }

  /** Entrada rapida (tela de login): usa conta admin padrao; exige backend com seed ou mesmo usuario. */
  async function enterWithDefaultCredentials() {
    await login(DEFAULT_LOGIN_EMAIL, DEFAULT_LOGIN_PASSWORD);
  }

  function logout() {
    localStorage.removeItem("@maricota:token");
    localStorage.removeItem("@maricota:user");
    setUser(null);
  }

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(user),
      login,
      enterWithDefaultCredentials,
      logout,
      user
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
