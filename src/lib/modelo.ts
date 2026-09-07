import {
  ANIO_BASE, BLOQUES, CICLO_CUOTA, CICLO_MARCA, CUOTA_POR_DEFECTO, CUPO_POR_DEFECTO,
} from "../constants";
import { LISTA } from "../data/lista";
import type { Bloque, Cuota, Estado, Hermano, Marca } from "../types";

let contador = 0;

/**
 * La lista es compartida: dos personas pueden dar de alta a la vez desde
 * navegadores distintos, así que un contador local no basta para no chocar.
 *
 * randomUUID solo existe en contexto seguro (https o localhost), y por VPN
 * contra la IP del NAS se entra por http. getRandomValues sí está siempre,
 * y es lo que de verdad importa aquí.
 */
export function nuevoId(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  if (c?.getRandomValues) {
    const b = new Uint8Array(16);
    c.getRandomValues(b);
    return `h${Array.from(b, (n) => n.toString(16).padStart(2, "0")).join("")}`;
  }
  contador += 1;
  return `h${Date.now().toString(36)}${contador.toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export function crearHermano(parcial: Partial<Hermano> = {}): Hermano {
  return {
    id: nuevoId(),
    nombre: "",
    bloque: "SUPLENTES",
    telefono: "",
    notas: "",
    cuotas: {},
    asis: {},
    ...parcial,
  };
}

export function esBloque(v: string): v is Bloque {
  return (BLOQUES as string[]).includes(v);
}

/** Devuelve el siguiente valor del ciclo al pulsar una celda. */
export function siguienteMarca(actual: Marca | undefined): Marca {
  const i = CICLO_MARCA.indexOf(actual ?? "");
  return CICLO_MARCA[(i + 1) % CICLO_MARCA.length];
}

export function siguienteCuota(actual: Cuota | undefined): Cuota {
  const i = CICLO_CUOTA.indexOf(actual ?? "");
  return CICLO_CUOTA[(i + 1) % CICLO_CUOTA.length];
}

export function esAnio(v: unknown): boolean {
  return /^(19|20)\d{2}$/.test(String(v ?? "").trim());
}

/** Las hojas antiguas marcaban las faltas con X. */
export function normalizarMarca(v: unknown): Marca {
  const s = String(v ?? "").trim().toUpperCase();
  if (s === "X") return "F";
  return (CICLO_MARCA as string[]).includes(s) ? (s as Marca) : "";
}

export function normalizarCuota(v: unknown): Cuota {
  const s = String(v ?? "").trim().toUpperCase();
  return (CICLO_CUOTA as string[]).includes(s) ? (s as Cuota) : "";
}

/** Convierte el CSV incrustado en hermanos. */
export function leerLista(csv: string): Hermano[] {
  return csv
    .split("\n")
    .map((linea) => linea.trim())
    .filter(Boolean)
    .map((linea) => {
      const [, nombre = "", bloque = "", telefono = "", exc = "", sm = ""] =
        linea.split(";");
      const asis: Hermano["asis"] = {};
      const marcaExc = normalizarMarca(exc);
      const marcaSm = normalizarMarca(sm);
      if (marcaExc || marcaSm) asis[ANIO_BASE] = { exc: marcaExc, sm: marcaSm };
      const b = bloque.trim();
      return crearHermano({
        nombre: nombre.trim(),
        bloque: esBloque(b) ? b : "SUPLENTES",
        telefono: telefono.trim(),
        asis,
      });
    });
}

export function estadoInicial(): Estado {
  return {
    cupo: CUPO_POR_DEFECTO,
    cuota: CUOTA_POR_DEFECTO,
    aniosCuotas: [ANIO_BASE],
    aniosAsis: [ANIO_BASE],
    hermanos: leerLista(LISTA),
  };
}

/** Nombres que aparecen más de una vez, en el orden en que salen. */
export function nombresRepetidos(hermanos: Hermano[]): string[] {
  const cuenta = new Map<string, number>();
  hermanos.forEach((h) => {
    const k = h.nombre.trim().toLowerCase();
    if (k) cuenta.set(k, (cuenta.get(k) ?? 0) + 1);
  });
  const vistos = new Set<string>();
  const salida: string[] = [];
  hermanos.forEach((h) => {
    const k = h.nombre.trim().toLowerCase();
    if (k && (cuenta.get(k) ?? 0) > 1 && !vistos.has(k)) {
      vistos.add(k);
      salida.push(h.nombre.trim());
    }
  });
  return salida;
}

export function contarBloque(hermanos: Hermano[], bloque: Bloque): number {
  return hermanos.filter((h) => h.bloque === bloque).length;
}

/**
 * Nº impreso de cada hermano, con numeración independiente por bloque:
 * Honorarios 1..N, titulares+suplentes juntos 1..M (el primer titular es 1,
 * el último suplente es M). El array devuelto tiene la misma longitud y orden
 * que `hermanos`.
 */
export function numerosPorBloque(hermanos: Hermano[]): number[] {
  const numeros: number[] = [];
  let honorarios = 0;
  let resto = 0;
  for (const h of hermanos) {
    if (h.bloque === "HONORARIOS") {
      honorarios += 1;
      numeros.push(honorarios);
    } else {
      resto += 1;
      numeros.push(resto);
    }
  }
  return numeros;
}

/** Honorarios + titulares: los que salen en la procesión. */
export function contarProcesionan(hermanos: Hermano[]): number {
  return hermanos.filter((h) => h.bloque !== "SUPLENTES").length;
}

/**
 * Cambia el bloque de un hermano y lo recoloca al final de su nuevo bloque,
 * justo antes del primer hermano del bloque siguiente (honorario → encima del
 * primer titular; titular → antes del primer suplente; suplente → al final).
 * Devuelve el array original si no hay nada que recolocar.
 */
export function reubicarEnBloque(
  hermanos: Hermano[],
  id: string,
  bloque: Bloque,
): Hermano[] {
  const i = hermanos.findIndex((h) => h.id === id);
  if (i === -1 || hermanos[i].bloque === bloque) return hermanos;
  const resto = hermanos.filter((_, k) => k !== i);
  const indice = BLOQUES.indexOf(bloque);
  const siguiente = indice + 1 < BLOQUES.length ? BLOQUES[indice + 1] : undefined;
  let destino = siguiente ? resto.findIndex((h) => h.bloque === siguiente) : -1;
  if (destino === -1) destino = resto.length;
  const l = [...resto];
  l.splice(destino, 0, { ...hermanos[i], bloque });
  return l;
}

/**
 * Mueve a un hermano dentro de su mismo bloque para que su Nº impreso pase a
 * ser `objetivo`. Rangos (los que aparecen en la tabla): honorarios 1..N,
 * titulares 1..t, suplentes (t+1)..M. Sin salir del bloque, así la lista
 * queda agrupada y la hoja impresa coherente. Devuelve el array original si
 * el objetivo no es un entero dentro del rango.
 */
export function moverANumero(
  hermanos: Hermano[],
  id: string,
  objetivo: number,
): Hermano[] {
  const i = hermanos.findIndex((h) => h.id === id);
  if (i === -1 || !Number.isInteger(objetivo)) return hermanos;
  const h = hermanos[i];

  const nHon = contarBloque(hermanos, "HONORARIOS");
  const nTit = contarBloque(hermanos, "TITULARES");
  const nTotal = hermanos.length - nHon;
  let p: number;
  if (h.bloque === "HONORARIOS") {
    if (objetivo < 1 || objetivo > nHon) return hermanos;
    p = objetivo;
  } else if (h.bloque === "TITULARES") {
    if (objetivo < 1 || objetivo > nTit) return hermanos;
    p = objetivo;
  } else {
    if (objetivo < nTit + 1 || objetivo > nTotal) return hermanos;
    p = objetivo - nTit;
  }
  if (numerosPorBloque(hermanos)[i] === objetivo) return hermanos;

  // Recoloca al hermano dentro del tramo de su bloque: quedan exactamente
  // p-1 hermanos del mismo bloque delante, y los demás conservan su orden.
  const sinEl = hermanos.filter((_, k) => k !== i);
  const primer = (cumple: (x: Hermano) => boolean): number => {
    const k = sinEl.findIndex(cumple);
    return k === -1 ? sinEl.length : k;
  };
  let inicio: number;
  let fin: number;
  if (h.bloque === "HONORARIOS") {
    inicio = 0;
    fin = primer((x) => x.bloque !== "HONORARIOS");
  } else if (h.bloque === "TITULARES") {
    inicio = primer((x) => x.bloque === "TITULARES");
    const primeroSup = primer((x) => x.bloque === "SUPLENTES");
    if (inicio === sinEl.length) inicio = primeroSup;
    fin = primeroSup;
  } else {
    inicio = primer((x) => x.bloque === "SUPLENTES");
    fin = sinEl.length;
  }
  let insertarEn = fin;
  let vistos = 0;
  for (let k = inicio; k < fin; k++) {
    if (sinEl[k].bloque === h.bloque) {
      vistos += 1;
      if (vistos === p) {
        insertarEn = k;
        break;
      }
    }
  }
  const l = [...sinEl];
  l.splice(insertarEn, 0, h);
  return l;
}
