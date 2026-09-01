import type { Bloque, ClaveProcesion, Cuota, Estado, Marca } from "../types";

/**
 * Lo que el navegador le manda a la API. En vez de enviar la lista entera
 * cada vez que tocas una celda, se manda solo lo que cambió. Así dos personas
 * marcando cosas distintas a la vez no se pisan: cada una escribe sus filas.
 */
export type Operacion =
  | { tipo: "ajustes"; cupo: number; cuota: number }
  | { tipo: "anio.alta"; cual: "cuotas" | "asistencias"; anio: number }
  | { tipo: "anio.baja"; cual: "cuotas" | "asistencias"; anio: number }
  | { tipo: "hermano.alta"; id: string; nombre: string; bloque: Bloque; telefono: string; notas: string }
  | { tipo: "hermano.baja"; id: string }
  | { tipo: "hermano.campos"; id: string; nombre?: string; bloque?: Bloque; telefono?: string; notas?: string }
  | { tipo: "hermano.orden"; ids: string[] }
  | { tipo: "cuota"; hermanoId: string; anio: number; estado: Cuota }
  | { tipo: "asistencia"; hermanoId: string; anio: number; procesion: ClaveProcesion; marca: Marca }
  | { tipo: "reemplazar"; estado: Estado };

export interface RespuestaEstado {
  version: number;
  estado: Estado;
}

export class ErrorApi extends Error {
  constructor(
    message: string,
    readonly codigo: number
  ) {
    super(message);
  }
}

async function pedir<T>(ruta: string, init?: RequestInit): Promise<T> {
  let r: Response;
  try {
    r = await fetch(ruta, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    // Sin red, o el contenedor de la API parado.
    throw new ErrorApi("No llego al servidor.", 0);
  }

  if (!r.ok) {
    const cuerpo = (await r.json().catch(() => null)) as { error?: string } | null;
    throw new ErrorApi(cuerpo?.error ?? `El servidor respondió ${r.status}.`, r.status);
  }

  return (await r.json()) as T;
}

export const api = {
  estado: () => pedir<RespuestaEstado>("/api/estado"),

  version: () => pedir<{ version: number }>("/api/version"),

  cambios: (ops: Operacion[]) =>
    pedir<{ version: number }>("/api/cambios", {
      method: "POST",
      body: JSON.stringify({ ops }),
    }),
};
