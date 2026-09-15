import type { Cuota, FilaLeida, Marca } from "../types";

/**
 * Alineación de filas leídas por la IA contra la lista actual, pura (sin DOM):
 * se empareja por NOMBRE, no por Nº, para que sirva con listas anteriores al
 * año en curso donde las posiciones han cambiado.
 */

export interface Alineable {
  id: string;
  /** Puesto impreso actual (1..N), coincide con el orden de la lista. */
  n: number;
  nombre: string;
}

/** Devuelve la marca para la revisión: vacías en automático, el resto a repasar. */
function confianzaDe(marcas: ReadonlyArray<Marca | Cuota>): number {
  return marcas.some((m) => m) ? 0.5 : 1;
}

/** Nombre en minúsculas, sin tildes ni signos, para emparejar lista y hoja. */
export function normalizarNombre(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[.,;:'"()\-–]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Alinea las filas transcritas (con su nombre y Nº impresos) contra la lista
 * de hermanos ACTUAL y devuelve `FilaLeida` en el orden de la lista.
 *
 * Reglas:
 *  - Quien está en la hoja pero no en la lista actual se OMITE (ya no figura).
 *  - Quien está en la lista actual se alinea con su posición actual.
 *  - Quien está en la lista actual y no aparece en la hoja simplemente no
 *    lleva marca (gente nueva).
 */
export function alinear(
  filas: { n: number; nombre?: string; marcas: (Marca | Cuota)[]; quitar?: boolean }[],
  lista: Alineable[],
  /** Nombres de la hoja (normalizados) que el usuario dice que son un hermano
      existente (errata/apellido mal): clave → id de ese hermano. */
  parejas: Record<string, string> = {},
): { filas: FilaLeida[]; omitidos: string[] } {
  const porNombre = new Map(lista.map((l) => [normalizarNombre(l.nombre), l]));
  const porId = new Map(lista.map((l) => [l.id, l]));
  const resultado: FilaLeida[] = [];
  const omitidos = new Set<string>();
  for (const f of filas) {
    const clave = f.nombre ? normalizarNombre(f.nombre) : "";
    let base = clave ? porNombre.get(clave) : undefined;
    if (!base && clave && parejas[clave]) base = porId.get(parejas[clave]);
    if (!base) {
      if (f.nombre) omitidos.add(f.nombre);
      continue;
    }
    resultado.push({
      id: base.id,
      n: base.n,
      nombre: base.nombre,
      marcas: f.marcas ?? [],
      confianza: confianzaDe(f.marcas ?? []),
      quitar: f.quitar,
    });
  }
  // Devolvemos en el orden de la lista, una fila por hermano (las parejas no
  // duplican: el mapa por id se queda con la última entrada de ese hermano).
  const porIdResultado = new Map(resultado.map((f) => [f.id, f]));
  const vistos = new Set<string>();
  return {
    filas: lista.flatMap((l) => {
      const f = porIdResultado.get(l.id);
      if (!f || vistos.has(l.id)) return [];
      vistos.add(l.id);
      return [f];
    }),
    omitidos: [...omitidos],
  };
}