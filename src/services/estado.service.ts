import type { Operacion, RespuestaEstado } from "../types";
import { http } from "./http";

export interface RespuestaVersion {
  version: number;
}

export const estadoService = {
  /** Estado completo del servidor (carga inicial y refrescos). */
  obtenerEstado: () => http.get<RespuestaEstado>("/api/estado").then((r) => r.data),

  /** Solo el número de versión: barato para el sondeo. */
  obtenerVersion: () => http.get<RespuestaVersion>("/api/version").then((r) => r.data),

  /** Aplica un lote de operaciones y devuelve la nueva versión. */
  guardarCambios: (ops: Operacion[]) =>
    http.post<RespuestaVersion>("/api/cambios", { ops }).then((r) => r.data),
};