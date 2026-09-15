import type { Cuota, Marca } from "../types";
import { http } from "./http";

/** Una fila tal como la devuelve la API (antes de alinear). */
export interface FilaApi {
  n: number;
  /** Nombre tal y como salió en la hoja; se usa para alinear contra la lista actual. */
  nombre?: string;
  /** Marcas en el MISMO ORDEN que el array de columnas pedido en la petición. */
  marcas: (Marca | Cuota)[];
  /** true si la fila está tachada en la foto: hay que quitarla de la lista. */
  quitar?: boolean;
}

interface RespuestaLectura {
  filas?: FilaApi[];
}

/** Manda una página (JPEG o HEIC en base64) a la IA del servidor. */
export async function leerFoto(
  imagenBase64: string,
  columnas: number[],
  tipo: "asistencia" | "cuotas",
  mime = "image/jpeg",
): Promise<FilaApi[]> {
  const respuesta = await http.post<RespuestaLectura>("/api/foto", {
    imagenBase64,
    columnas,
    tipo,
    mime,
  });
  return respuesta.data.filas ?? [];
}