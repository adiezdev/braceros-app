import type pg from "pg";

import { pool } from "./db.js";
import type { Asistencia, Estado, Hermano, HermanoArchivado } from "./tipos.js";

/**
 * Reconstruye el Estado que espera la interfaz a partir de las tablas
 * normalizadas. Cinco consultas, sin N+1: se traen las listas enteras y se
 * cosen en memoria. Con 130 hermanos esto es instantáneo.
 */
export async function leerEstado(c: pg.PoolClient | pg.Pool = pool): Promise<Estado> {
  const [ajustes, hermanos, cuotas, asis, aniosC, aniosA] = await Promise.all([
    c.query<{ cupo: number; cuota_euros: number }>("SELECT cupo, cuota_euros FROM ajustes"),
    c.query<Omit<Hermano, "cuotas" | "asis"> & { archivado: boolean; puesto_archivado: number | null }>(
      "SELECT id, nombre, bloque, telefono, notas, archivado, puesto_archivado FROM hermano ORDER BY puesto NULLS LAST, puesto_archivado"
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

  const lista: Hermano[] = [];
  const archivados: HermanoArchivado[] = [];
  const porId = new Map<string, Hermano | HermanoArchivado>();

  for (const h of hermanos.rows) {
    const { archivado, puesto_archivado, ...datos } = h;
    if (archivado) {
      const ar: HermanoArchivado = {
        ...datos,
        bloque: datos.bloque,
        numero: puesto_archivado ?? 0,
        cuotas: {},
        asis: {},
      };
      archivados.push(ar);
      porId.set(ar.id, ar);
    } else {
      const completo: Hermano = { ...datos, cuotas: {}, asis: {} };
      lista.push(completo);
      porId.set(completo.id, completo);
    }
  }

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
    archivados,
  };
}

/** Id del último cambio. Es lo que sondean los navegadores abiertos. */
export async function versionActual(c: pg.PoolClient | pg.Pool = pool): Promise<number> {
  const r = await c.query<{ v: number }>("SELECT COALESCE(MAX(id), 0) AS v FROM cambio");
  return r.rows[0]?.v ?? 0;
}
