import axios from "axios";

/** Error de API con su código HTTP (0 = sin red / contenedor parado). */
export class ErrorApi extends Error {
  constructor(
    message: string,
    readonly codigo: number,
  ) {
    super(message);
  }
}

const CLAVE_AUTH = "braceros.auth";

let _token: string | null = null;

export function setToken(token: string | null): void {
  _token = token;
}

export function getToken(): string | null {
  return _token;
}

/** Quita la sesión guardada sin avisar a nadie. */
export function limpiarSesionGuardada(): void {
  setToken(null);
  localStorage.removeItem(CLAVE_AUTH);
}

/** Token caducado o inválido (401): nadie entra ni sale; se vuelve al login. */
export function expirarSesion(): void {
  limpiarSesionGuardada();
  window.dispatchEvent(new Event("auth:caducado"));
}

export function sesionGuardada(): { token: string; username: string } | null {
  const crudo = localStorage.getItem(CLAVE_AUTH);
  if (!crudo) return null;
  try {
    const v = JSON.parse(crudo) as { token?: unknown; username?: unknown };
    if (typeof v.token === "string" && typeof v.username === "string") {
      return { token: v.token, username: v.username };
    }
    return null;
  } catch {
    return null;
  }
}

export function guardarSesion(token: string, username: string): void {
  setToken(token);
  localStorage.setItem(CLAVE_AUTH, JSON.stringify({ token, username }));
}

export const http = axios.create({
  baseURL: "/",
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

http.interceptors.request.use((config) => {
  if (_token) config.headers.Authorization = `Bearer ${_token}`;
  return config;
});

http.interceptors.response.use(
  (respuesta) => respuesta,
  (error) => {
    if (error.response?.status === 401) {
      expirarSesion();
    } else if (!error.response) {
      // Sin red, o el contenedor de la API parado.
      throw new ErrorApi("No llego al servidor.", 0);
    }
    const cuerpo = error.response.data as { error?: string } | undefined;
    throw new ErrorApi(
      cuerpo?.error ?? `El servidor respondió ${error.response.status}.`,
      error.response.status,
    );
  },
);