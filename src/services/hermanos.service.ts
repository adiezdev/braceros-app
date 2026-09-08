import { diferencias } from "../lib/diff";
import type { Estado, Operacion } from "../types";

/** Planifica las operaciones de hermanos que separan dos estados. */
export function planificarOperaciones(antes: Estado, ahora: Estado): Operacion[] {
  return diferencias(antes, ahora);
}

/** Sustituye el estado entero (cargar un Excel o restaurar la lista transcrita). */
export const operacionReemplazar = (estado: Estado): Operacion => ({ tipo: "reemplazar", estado });