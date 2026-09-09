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

let _token: string | null = null;

export function setToken(token: string | null): void {
  _token = token;
}

export function getToken(): string | null {
  return _token;
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
    if (!error.response) {
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