import type { Asistencia, ClaveProcesion } from "../types";

/** Cualquier fuente que tenga historial de asistencias por año (activos y archivados). */
export interface ConHistorial {
  asis: Record<number, Asistencia>;
}

export interface AnioAsistencia {
  total: number;
  v: number;
  f: number;
  fj: number;
  /** v / total (null si nadie de ese año está registrado). */
  pct: number | null;
}

export interface PuntoSerie {
  anio: number;
  exc: AnioAsistencia;
  sm: AnioAsistencia;
}

export type ClaveProcesionSerie = ClaveProcesion;

/**
 * Asistencia por año y procesión sobre la población con historial (lista
 * activa + archivados). El total de cada año es cuánta gente tiene anotado
 * algo (V/F/FJ/―) en la hoja de ese año; el porcentaje es v sobre ese total.
 */
export function serieAsistencia(
  poblacion: ReadonlyArray<ConHistorial>,
  anios: number[],
): PuntoSerie[] {
  const contar = (anio: number, procesion: ClaveProcesion): AnioAsistencia => {
    let total = 0;
    let v = 0;
    let f = 0;
    let fj = 0;
    for (const p of poblacion) {
      const a = p.asis?.[anio];
      if (!a) continue;
      total += 1;
      const marca = a[procesion];
      if (marca === "V") v += 1;
      else if (marca === "F") f += 1;
      else if (marca === "FJ") fj += 1;
    }
    return { total, v, f, fj, pct: total ? Math.round((v / total) * 100) : null };
  };

  return anios.map((anio) => ({
    anio,
    exc: contar(anio, "exc"),
    sm: contar(anio, "sm"),
  }));
}