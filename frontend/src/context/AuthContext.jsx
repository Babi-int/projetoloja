import { createContext, useContext, useMemo, useState } from "react";
import api from "../api/client";

/** Sessao local quando nao ha login por API (modo sem senha no backend com AUTH_DISABLED). */
const GUEST_ADMIN = {
  id: "bypass",
  name: "Administrador",
  email: "admin@maricotakids.com",
  role: "ADMIN"
};

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

  /** Entrada sem senha: apenas estado local; a API precisa de AUTH_DISABLED=true no backend. */
  function enterWithoutPassword() {
    localStorage.removeItem("@maricota:token");
    localStorage.setItem("@maricota:user", JSON.stringify(GUEST_ADMIN));
    setUser(GUEST_ADMIN);
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
      enterWithoutPassword,
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
