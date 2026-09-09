import { useCallback, useEffect, useState } from "react";

import { notificar } from "../lib/toast";
import {
  ErrorApi,
  guardarSesion,
  http,
  limpiarSesionGuardada,
  sesionGuardada,
  setToken as setTokenGuardado,
} from "../services/http";

interface AuthState {
  token: string | null;
  username: string | null;
}

/** Arranca con la sesión guardada en localStorage: refrescar ya no pide login. */
function estadoInicial(): AuthState {
  const guardada = sesionGuardada();
  if (guardada) {
    setTokenGuardado(guardada.token);
    return { token: guardada.token, username: guardada.username };
  }
  return { token: null, username: null };
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>(estadoInicial);
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
      guardarSesion(data.token, data.username);
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
    limpiarSesionGuardada();
    setAuth({ token: null, username: null });
  }, []);

  // Token caducado (401) mientras la app está abierta: vuelve al login solo.
  useEffect(() => {
    const alCaducar = () => {
      limpiarSesionGuardada();
      setAuth({ token: null, username: null });
    };
    window.addEventListener("auth:caducado", alCaducar);
    return () => window.removeEventListener("auth:caducado", alCaducar);
  }, []);

  return { ...auth, login, logout, error, cargando };
}