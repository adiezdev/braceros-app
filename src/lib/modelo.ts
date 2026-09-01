import {
  ANIO_BASE, BLOQUES, CICLO_CUOTA, CICLO_MARCA, CUOTA_POR_DEFECTO, CUPO_POR_DEFECTO,
} from "../constants";
import { LISTA } from "../data/lista";
import type { Bloque, Cuota, Estado, Hermano, Marca } from "../types";

let contador = 0;

export function nuevoId(): string {
  contador += 1;
  return `h${Date.now().toString(36)}${contador.toString(36)}`;
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

/** Honorarios + titulares: los que salen en la procesión. */
export function contarProcesionan(hermanos: Hermano[]): number {
  return hermanos.filter((h) => h.bloque !== "SUPLENTES").length;
}
