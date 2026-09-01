import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

const aqui = dirname(fileURLToPath(import.meta.url));

// numeric de Postgres llega como string para no perder precisión. La cuota
// son euros con dos decimales y cabe de sobra en un number.
pg.types.setTypeParser(1700, (v) => Number(v));
// int8 (el id de cambio) igual: no vamos a pasar de 2^53 apuntes.
pg.types.setTypeParser(20, (v) => Number(v));

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 8,
  idleTimeoutMillis: 30_000,
});

/** Ejecuta el cuerpo dentro de una transacción y suelta la conexión pase lo que pase. */
export async function enTransaccion<T>(fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const r = await fn(c);
    await c.query("COMMIT");
    return r;
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

/**
 * Aplica los ficheros de migraciones/ que aún no estén aplicados, en orden.
 * Se ejecuta al arrancar el contenedor, así que desplegar ya migra.
 */
export async function migrar(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migracion (
      nombre   text PRIMARY KEY,
      aplicada timestamptz NOT NULL DEFAULT now()
    )
  `);

  const carpeta = join(aqui, "..", "migraciones");
  const ficheros = (await readdir(carpeta)).filter((f) => f.endsWith(".sql")).sort();

  for (const f of ficheros) {
    // El lock evita que dos réplicas de la API migren a la vez.
    await enTransaccion(async (c) => {
      await c.query("SELECT pg_advisory_xact_lock(918273)");
      const { rowCount } = await c.query("SELECT 1 FROM migracion WHERE nombre = $1", [f]);
      if (rowCount) return;
      console.log(`[db] aplicando migración ${f}`);
      await c.query(await readFile(join(carpeta, f), "utf8"));
      await c.query("INSERT INTO migracion (nombre) VALUES ($1)", [f]);
    });
  }
}

/** Espera a que Postgres acepte conexiones. Al arrancar el compose, tarda unos segundos. */
export async function esperarBase(intentos = 30): Promise<void> {
  for (let i = 1; i <= intentos; i++) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (e) {
      if (i === intentos) throw e;
      console.log(`[db] esperando a Postgres (${i}/${intentos})`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}
