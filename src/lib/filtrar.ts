import type { Hermano } from "../types";

export interface FilaVisible {
  hermano: Hermano;
  indice: number;
}

/** Hermandos cuyo nombre coincide con el filtro, con su índice en la lista. */
export function filtrarVisibles(hermanos: Hermano[], filtro: string): FilaVisible[] {
  const consulta = filtro.trim().toLowerCase();
  return hermanos
    .map((hermano, indice) => ({ hermano, indice }))
    .filter(({ hermano }) => !consulta || hermano.nombre.toLowerCase().includes(consulta));
}