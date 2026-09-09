import { useCallback, useState } from "react";

import { notificar } from "../lib/toast";
import { http, ErrorApi, setToken } from "../services/http";

interface AuthState {
  token: string | null;
  username: string | null;
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>({ token: null, username: null });
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const login = useCallback(async (username: string, password: string) => {
    setCargando(true);
    setError(null);
    try {
      const { data } = await http.post<{ token: string; username: string }>(
        "/api/login",
        { username, password },
      );
      setToken(data.token);
      setAuth({ token: data.token, username: data.username });
    } catch (e) {
      const msg = e instanceof ErrorApi ? e.message : "No se pudo iniciar sesión.";
      setError(msg);
      notificar("No se pudo iniciar sesión", "error", msg);
      throw e;
    } finally {
      setCargando(false);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setAuth({ token: null, username: null });
  }, []);

  return { ...auth, login, logout, error, cargando };
}
