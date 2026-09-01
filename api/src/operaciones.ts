import type pg from "pg";

import { BLOQUES, CUOTAS, MARCAS } from "./tipos.js";
import type { Bloque, Cuota, Estado, Marca, Operacion } from "./tipos.js";

export class ErrorPeticion extends Error {
  constructor(
    message: string,
    readonly codigo = 400
  ) {
    super(message);
  }
}

/* --- validación ---------------------------------------------------- */

function texto(v: unknown, campo: string, max = 200): string {
  if (typeof v !== "string") throw new ErrorPeticion(`${campo} debe ser texto`);
  if (v.length > max) throw new ErrorPeticion(`${campo} pasa de ${max} caracteres`);
  return v;
}

function entero(v: unknown, campo: string, min: number, max: number): number {
  if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) {
    throw new ErrorPeticion(`${campo} debe ser un entero entre ${min} y ${max}`);
  }
  return v;
}

function anio(v: unknown): number {
  return entero(v, "anio", 1900, 2999);
}

function bloque(v: unknown): Bloque {
  if (!BLOQUES.includes(v as Bloque)) throw new ErrorPeticion(`bloque inválido: ${String(v)}`);
  return v as Bloque;
}

function marca(v: unknown): Marca {
  if (!MARCAS.includes(v as Marca)) throw new ErrorPeticion(`marca inválida: ${String(v)}`);
  return v as Marca;
}

function cuotaVal(v: unknown): Cuota {
  if (!CUOTAS.includes(v as Cuota)) throw new ErrorPeticion(`cuota inválida: ${String(v)}`);
  return v as Cuota;
}

/* --- utilidades ---------------------------------------------------- */

/** Se asegura de que el año existe como columna antes de escribir en él. */
async function garantizarAnioCuota(c: pg.PoolClient, a: number): Promise<void> {
  await c.query("INSERT INTO anio_cuota (anio) VALUES ($1) ON CONFLICT DO NOTHING", [a]);
}

async function garantizarAnioAsistencia(c: pg.PoolClient, a: number): Promise<void> {
  await c.query("INSERT INTO anio_asistencia (anio) VALUES ($1) ON CONFLICT DO NOTHING", [a]);
  // Un año de asistencias son todas sus procesiones. Si mañana hay una
  // tercera en la tabla procesion, los años nuevos la incluyen solos.
  await c.query(
    `INSERT INTO evento (anio, procesion)
     SELECT $1, clave FROM procesion
     ON CONFLICT DO NOTHING`,
    [a]
  );
}

async function siguientePuesto(c: pg.PoolClient): Promise<number> {
  const r = await c.query<{ p: number }>("SELECT COALESCE(MAX(puesto), 0) + 1 AS p FROM hermano");
  return r.rows[0]!.p;
}

/** Reordena la lista completa. El puesto sale del orden del array. */
async function aplicarOrden(c: pg.PoolClient, ids: string[]): Promise<void> {
  if (!ids.length) return;
  if (new Set(ids).size !== ids.length) throw new ErrorPeticion("hay ids repetidos en el orden");

  await c.query(
    `UPDATE hermano h SET puesto = v.puesto
       FROM (SELECT id, ordinalidad::int AS puesto
               FROM unnest($1::text[]) WITH ORDINALITY AS t(id, ordinalidad)) v
      WHERE h.id = v.id`,
    [ids]
  );

  // Cualquiera que no viniera en la lista se va al final, para que no choque
  // con los puestos recién asignados.
  await c.query(
    `UPDATE hermano h SET puesto = $2 + sub.rn
       FROM (SELECT id, row_number() OVER (ORDER BY puesto, id) AS rn
               FROM hermano WHERE NOT (id = ANY($1::text[]))) sub
      WHERE h.id = sub.id`,
    [ids, ids.length]
  );
}

/** Borra todo y vuelve a escribirlo. Para "Cargar Excel" y "Restaurar lista". */
async function reemplazarTodo(c: pg.PoolClient, e: Estado): Promise<void> {
  if (!Array.isArray(e?.hermanos)) throw new ErrorPeticion("estado sin hermanos");
  if (e.hermanos.length > 5000) throw new ErrorPeticion("demasiados hermanos");

  // El orden importa: las hijas cuelgan de hermano y de los años.
  await c.query("DELETE FROM asistencia");
  await c.query("DELETE FROM cuota");
  await c.query("DELETE FROM evento");
  await c.query("DELETE FROM hermano");
  await c.query("DELETE FROM anio_cuota");
  await c.query("DELETE FROM anio_asistencia");

  await c.query("UPDATE ajustes SET cupo = $1, cuota_euros = $2", [
    entero(e.cupo, "cupo", 0, 100000),
    typeof e.cuota === "number" && e.cuota >= 0 ? e.cuota : 0,
  ]);

  for (const a of e.aniosCuotas ?? []) await garantizarAnioCuota(c, anio(a));
  for (const a of e.aniosAsis ?? []) await garantizarAnioAsistencia(c, anio(a));

  let puesto = 0;
  for (const h of e.hermanos) {
    puesto += 1;
    await c.query(
      `INSERT INTO hermano (id, puesto, nombre, bloque, telefono, notas)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        texto(h.id, "id", 64),
        puesto,
        texto(h.nombre ?? "", "nombre"),
        bloque(h.bloque),
        texto(h.telefono ?? "", "telefono", 40),
        texto(h.notas ?? "", "notas", 500),
      ]
    );

    for (const [a, estado] of Object.entries(h.cuotas ?? {})) {
      const v = cuotaVal(estado);
      if (!v) continue;
      await garantizarAnioCuota(c, anio(Number(a)));
      await c.query(
        "INSERT INTO cuota (hermano_id, anio, estado) VALUES ($1, $2, $3) ON CONFLICT (hermano_id, anio) DO UPDATE SET estado = EXCLUDED.estado",
        [h.id, Number(a), v]
      );
    }

    for (const [a, par] of Object.entries(h.asis ?? {})) {
      await garantizarAnioAsistencia(c, anio(Number(a)));
      for (const p of ["exc", "sm"] as const) {
        const m = marca(par?.[p] ?? "");
        if (!m) continue;
        await c.query(
          "INSERT INTO asistencia (hermano_id, anio, procesion, marca) VALUES ($1, $2, $3, $4) ON CONFLICT (hermano_id, anio, procesion) DO UPDATE SET marca = EXCLUDED.marca",
          [h.id, Number(a), p, m]
        );
      }
    }
  }
}

/* --- aplicar ------------------------------------------------------- */

export async function aplicar(c: pg.PoolClient, ops: Operacion[]): Promise<void> {
  for (const op of ops) {
    switch (op?.tipo) {
      case "ajustes":
        await c.query("UPDATE ajustes SET cupo = $1, cuota_euros = $2", [
          entero(op.cupo, "cupo", 0, 100000),
          typeof op.cuota === "number" && op.cuota >= 0 ? op.cuota : 0,
        ]);
        break;

      case "anio.alta":
        if (op.cual === "cuotas") await garantizarAnioCuota(c, anio(op.anio));
        else await garantizarAnioAsistencia(c, anio(op.anio));
        break;

      case "anio.baja":
        // El ON DELETE CASCADE se lleva las marcas de ese año.
        await c.query(
          op.cual === "cuotas"
            ? "DELETE FROM anio_cuota WHERE anio = $1"
            : "DELETE FROM anio_asistencia WHERE anio = $1",
          [anio(op.anio)]
        );
        break;

      case "hermano.alta":
        await c.query(
          `INSERT INTO hermano (id, puesto, nombre, bloque, telefono, notas)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO NOTHING`,
          [
            texto(op.id, "id", 64),
            await siguientePuesto(c),
            texto(op.nombre ?? "", "nombre"),
            bloque(op.bloque),
            texto(op.telefono ?? "", "telefono", 40),
            texto(op.notas ?? "", "notas", 500),
          ]
        );
        break;

      case "hermano.baja":
        await c.query("DELETE FROM hermano WHERE id = $1", [texto(op.id, "id", 64)]);
        break;

      case "hermano.campos": {
        // Solo se tocan los campos que vienen: si otra persona está editando
        // el teléfono del mismo hermano, no le pisamos el nombre.
        const set: string[] = [];
        const val: unknown[] = [texto(op.id, "id", 64)];
        if (op.nombre !== undefined) set.push(`nombre = $${val.push(texto(op.nombre, "nombre"))}`);
        if (op.bloque !== undefined) set.push(`bloque = $${val.push(bloque(op.bloque))}`);
        if (op.telefono !== undefined) set.push(`telefono = $${val.push(texto(op.telefono, "telefono", 40))}`);
        if (op.notas !== undefined) set.push(`notas = $${val.push(texto(op.notas, "notas", 500))}`);
        if (!set.length) break;
        await c.query(`UPDATE hermano SET ${set.join(", ")} WHERE id = $1`, val);
        break;
      }

      case "hermano.orden":
        if (!Array.isArray(op.ids)) throw new ErrorPeticion("orden sin ids");
        if (op.ids.length > 5000) throw new ErrorPeticion("orden demasiado largo");
        await aplicarOrden(c, op.ids.map((i) => texto(i, "id", 64)));
        break;

      case "cuota": {
        const a = anio(op.anio);
        const v = cuotaVal(op.estado);
        // Vacío no es un valor: es que no hay fila.
        if (!v) {
          await c.query("DELETE FROM cuota WHERE hermano_id = $1 AND anio = $2", [op.hermanoId, a]);
        } else {
          await garantizarAnioCuota(c, a);
          await c.query(
            `INSERT INTO cuota (hermano_id, anio, estado) VALUES ($1, $2, $3)
             ON CONFLICT (hermano_id, anio) DO UPDATE SET estado = EXCLUDED.estado`,
            [texto(op.hermanoId, "hermanoId", 64), a, v]
          );
        }
        break;
      }

      case "asistencia": {
        const a = anio(op.anio);
        const m = marca(op.marca);
        const p = texto(op.procesion, "procesion", 16);
        if (!m) {
          await c.query(
            "DELETE FROM asistencia WHERE hermano_id = $1 AND anio = $2 AND procesion = $3",
            [op.hermanoId, a, p]
          );
        } else {
          await garantizarAnioAsistencia(c, a);
          await c.query(
            `INSERT INTO asistencia (hermano_id, anio, procesion, marca) VALUES ($1, $2, $3, $4)
             ON CONFLICT (hermano_id, anio, procesion) DO UPDATE SET marca = EXCLUDED.marca`,
            [texto(op.hermanoId, "hermanoId", 64), a, p, m]
          );
        }
        break;
      }

      case "reemplazar":
        await reemplazarTodo(c, op.estado);
        break;

      default:
        throw new ErrorPeticion(`operación desconocida: ${String((op as { tipo?: string })?.tipo)}`);
    }
  }
}

/** Una línea legible para la bitácora, sin volcar datos personales. */
export function resumir(ops: Operacion[]): string {
  const cuenta = new Map<string, number>();
  for (const o of ops) cuenta.set(o.tipo, (cuenta.get(o.tipo) ?? 0) + 1);
  return [...cuenta].map(([t, n]) => (n > 1 ? `${t}×${n}` : t)).join(", ");
}
