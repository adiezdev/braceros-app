import { PROCESIONES } from "../constants";
import type { Estado, Hermano, Operacion } from "../types";

const VACIO: Pick<Hermano, "cuotas" | "asis"> = { cuotas: {}, asis: {} };

/**
 * Compara dos estados y saca la lista de cambios que hay que mandar.
 *
 * Es el corazón del asunto: gracias a esto los componentes siguen llamando a
 * setEst como siempre, sin enterarse de que detrás hay una base de datos.
 */
export function diferencias(antes: Estado, ahora: Estado): Operacion[] {
  const ops: Operacion[] = [];

  // Años que desaparecen. Se calculan ya para no generar después cientos de
  // borrados de celda que la cascada de la base va a hacer sola.
  const cuotasFuera = new Set(antes.aniosCuotas.filter((a) => !ahora.aniosCuotas.includes(a)));
  const asisFuera = new Set(antes.aniosAsis.filter((a) => !ahora.aniosAsis.includes(a)));

  // 1. Años nuevos primero: las marcas que vengan detrás los necesitan.
  for (const a of ahora.aniosCuotas) {
    if (!antes.aniosCuotas.includes(a)) ops.push({ tipo: "anio.alta", cual: "cuotas", anio: a });
  }
  for (const a of ahora.aniosAsis) {
    if (!antes.aniosAsis.includes(a)) ops.push({ tipo: "anio.alta", cual: "asistencias", anio: a });
  }

  // 2. Cupo y cuota.
  if (antes.cupo !== ahora.cupo || antes.cuota !== ahora.cuota) {
    ops.push({ tipo: "ajustes", cupo: ahora.cupo, cuota: ahora.cuota });
  }

  const porIdAntes = new Map(antes.hermanos.map((h) => [h.id, h]));
  const idsAhora = new Set(ahora.hermanos.map((h) => h.id));

  for (const h of ahora.hermanos) {
    const p = porIdAntes.get(h.id);

    // 3. Altas.
    if (!p) {
      ops.push({
        tipo: "hermano.alta",
        id: h.id,
        nombre: h.nombre,
        bloque: h.bloque,
        telefono: h.telefono,
        notas: h.notas,
      });
    } else {
      // 4. Campos sueltos: solo los que cambian, para no pisar lo que otro
      // esté editando del mismo hermano.
      const campos: Partial<Pick<Hermano, "nombre" | "bloque" | "telefono" | "notas">> = {};
      if (p.nombre !== h.nombre) campos.nombre = h.nombre;
      if (p.bloque !== h.bloque) campos.bloque = h.bloque;
      if (p.telefono !== h.telefono) campos.telefono = h.telefono;
      if (p.notas !== h.notas) campos.notas = h.notas;
      if (Object.keys(campos).length) ops.push({ tipo: "hermano.campos", id: h.id, ...campos });
    }

    const base = p ?? VACIO;

    // 5. Cuotas.
    for (const clave of union(base.cuotas, h.cuotas)) {
      if (cuotasFuera.has(clave)) continue;
      const va = base.cuotas[clave] ?? "";
      const vb = h.cuotas[clave] ?? "";
      if (va !== vb) ops.push({ tipo: "cuota", hermanoId: h.id, anio: clave, estado: vb });
    }

    // 6. Asistencias, una marca por procesión.
    for (const clave of union(base.asis, h.asis)) {
      if (asisFuera.has(clave)) continue;
      for (const { clave: proc } of PROCESIONES) {
        const va = base.asis[clave]?.[proc] ?? "";
        const vb = h.asis[clave]?.[proc] ?? "";
        if (va !== vb) {
          ops.push({ tipo: "asistencia", hermanoId: h.id, anio: clave, procesion: proc, marca: vb });
        }
      }
    }
  }

  // 7. Orden. Si la secuencia de ids no es la misma, se manda entera:
  // es una sola operación y evita razonar sobre subidas y bajadas.
  if (!mismaSecuencia(antes.hermanos, ahora.hermanos)) {
    ops.push({ tipo: "hermano.orden", ids: ahora.hermanos.map((h) => h.id) });
  }

  // 8. Bajas, después de reordenar.
  for (const h of antes.hermanos) {
    if (!idsAhora.has(h.id)) ops.push({ tipo: "hermano.baja", id: h.id });
  }

  // 9. Años que se van, al final: su cascada limpia las marcas.
  for (const a of cuotasFuera) ops.push({ tipo: "anio.baja", cual: "cuotas", anio: a });
  for (const a of asisFuera) ops.push({ tipo: "anio.baja", cual: "asistencias", anio: a });

  // A propósito no hay atajo del tipo "si son muchas, mando el estado
  // entero": eso convertiría un cambio grande en un borrado y alta de toda
  // la lista, y se llevaría por delante lo que otra persona esté tocando.
  // Los dos casos que sí sustituyen todo (cargar un Excel y restaurar la
  // lista) llaman a reemplazar() explícitamente, y se avisa antes.
  return ops;
}

/** ¿Están los mismos hermanos, en el mismo orden? */
function mismaSecuencia(a: Hermano[], b: Hermano[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((h, i) => h.id === b[i]?.id);
}

/** Los años que aparecen en cualquiera de los dos lados, como números. */
function union(a: Record<number, unknown>, b: Record<number, unknown>): number[] {
  const s = new Set<number>();
  for (const k of Object.keys(a)) s.add(Number(k));
  for (const k of Object.keys(b)) s.add(Number(k));
  return [...s];
}
