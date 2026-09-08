import type { Cuota, Marca } from "../types";
import { http } from "./http";

/** Una fila tal como la devuelve la API (antes de alinear). */
export interface FilaApi {
  n: number;
  marca: Marca | Cuota;
}

interface RespuestaLectura {
  filas?: FilaApi[];
}

/** Manda una página ya redimensionada en base64 a la IA del servidor. */
export async function leerFoto(
  imagenBase64: string,
  columna: number,
  tipo: "asistencia" | "cuotas",
): Promise<FilaApi[]> {
  const respuesta = await http.post<RespuestaLectura>("/api/foto", {
    imagenBase64,
    columna,
    tipo,
  });
  return respuesta.data.filas ?? [];
}