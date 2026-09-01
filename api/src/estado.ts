import type pg from "pg";

import { pool } from "./db.js";
import type { Asistencia, Estado, Hermano } from "./tipos.js";

/**
 * Reconstruye el Estado que espera la interfaz a partir de las tablas
 * normalizadas. Cinco consultas, sin N+1: se traen las listas enteras y se
 * cosen en memoria. Con 130 hermanos esto es instantáneo.
 */
export async function leerEstado(c: pg.PoolClient | pg.Pool = pool): Promise<Estado> {
  const [ajustes, hermanos, cuotas, asis, aniosC, aniosA] = await Promise.all([
    c.query<{ cupo: number; cuota_euros: number }>("SELECT cupo, cuota_euros FROM ajustes"),
    c.query<Omit<Hermano, "cuotas" | "asis">>(
      "SELECT id, nombre, bloque, telefono, notas FROM hermano ORDER BY puesto"
    ),
    c.query<{ hermano_id: string; anio: number; estado: "S" | "N" }>(
      "SELECT hermano_id, anio, estado FROM cuota"
    ),
    c.query<{ hermano_id: string; anio: number; procesion: string; marca: "V" | "F" | "FJ" }>(
      "SELECT hermano_id, anio, procesion, marca FROM asistencia"
    ),
    c.query<{ anio: number }>("SELECT anio FROM anio_cuota ORDER BY anio"),
    c.query<{ anio: number }>("SELECT anio FROM anio_asistencia ORDER BY anio"),
  ]);

  const porId = new Map<string, Hermano>();
  const lista = hermanos.rows.map((h) => {
    const completo: Hermano = { ...h, cuotas: {}, asis: {} };
    porId.set(h.id, completo);
    return completo;
  });

  for (const r of cuotas.rows) {
    const h = porId.get(r.hermano_id);
    if (h) h.cuotas[r.anio] = r.estado;
  }

  for (const r of asis.rows) {
    const h = porId.get(r.hermano_id);
    if (!h) continue;
    // La interfaz espera siempre el par completo; el que falte va vacío.
    const par: Asistencia = h.asis[r.anio] ?? { exc: "", sm: "" };
    if (r.procesion === "exc" || r.procesion === "sm") par[r.procesion] = r.marca;
    h.asis[r.anio] = par;
  }

  return {
    cupo: ajustes.rows[0]?.cupo ?? 73,
    cuota: ajustes.rows[0]?.cuota_euros ?? 10,
    aniosCuotas: aniosC.rows.map((r) => r.anio),
    aniosAsis: aniosA.rows.map((r) => r.anio),
    hermanos: lista,
  };
}

/** Id del último cambio. Es lo que sondean los navegadores abiertos. */
export async function versionActual(c: pg.PoolClient | pg.Pool = pool): Promise<number> {
  const r = await c.query<{ v: number }>("SELECT COALESCE(MAX(id), 0) AS v FROM cambio");
  return r.rows[0]?.v ?? 0;
}
