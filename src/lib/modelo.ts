import {
  ANIO_BASE, BLOQUES, CICLO_CUOTA, CICLO_MARCA, CUOTA_POR_DEFECTO, CUPO_POR_DEFECTO,
} from "../constants";
import { LISTA } from "../data/lista";
import type { Bloque, ClaveProcesion, Cuota, Estado, Hermano, HermanoArchivado, Marca } from "../types";

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

export function alternarCuota(hermanos: Hermano[], id: string, anio: number): Hermano[] {
  return hermanos.map((h) =>
    h.id === id
      ? { ...h, cuotas: { ...h.cuotas, [anio]: siguienteCuota(h.cuotas?.[anio]) } }
      : h,
  );
}

export function alternarAsistencia(
  hermanos: Hermano[],
  id: string,
  anio: number,
  clave: ClaveProcesion,
): Hermano[] {
  return hermanos.map((h) => {
    if (h.id !== id) return h;
    const prev = h.asis?.[anio] ?? { exc: "" as Marca, sm: "" as Marca };
    return {
      ...h,
      asis: {
        ...h.asis,
        [anio]: { ...prev, [clave]: siguienteMarca(prev[clave]) },
      },
    };
  });
}

export function cambiarCampoHermano<C extends keyof Hermano>(
  hermanos: Hermano[],
  id: string,
  campo: C,
  valor: Hermano[C],
): Hermano[] {
  if (campo === "bloque") return reubicarEnBloque(hermanos, id, valor as Bloque);
  return hermanos.map((h) => (h.id === id ? { ...h, [campo]: valor } : h));
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
    archivados: [],
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
 * Tras mover filas, asegura que el bloque (titular/suplente) cuadre con el
 * lado del cierre del cupo: por encima de la línea → titular, por debajo →
 * suplente. Los honorarios no se tocan. No cambia nada si la línea no cae
 * dentro de la lista.
 */
export function corregirPorCupo(
  hermanos: Hermano[],
  indices: number[],
  cupo: number,
): Hermano[] {
  if (cupo < 1 || cupo > hermanos.length) return hermanos;
  const l = [...hermanos];
  let cambio = false;
  for (const k of indices) {
    const h = l[k];
    if (h.bloque === "TITULARES" && k >= cupo) {
      l[k] = { ...h, bloque: "SUPLENTES" };
      cambio = true;
    } else if (h.bloque === "SUPLENTES" && k < cupo) {
      l[k] = { ...h, bloque: "TITULARES" };
      cambio = true;
    }
  }
  return cambio ? l : hermanos;
}

/**
 * Mueve a un hermano para que su Nº impreso pase a ser `objetivo`.
 * Honorarios: 1..N, siempre dentro de su tramo. Titulares y suplentes
 * comparten la numeración continua 1..M de la hoja: el puesto físico lo
 * marca el objetivo y el bloque se fija según el cierre del cupo (un número
 * de titulares convierte en titular, uno de suplentes en suplente).
 * Devuelve el array original si el objetivo no es válido.
 */
export function moverANumero(
  hermanos: Hermano[],
  id: string,
  objetivo: number,
  cupo: number,
): Hermano[] {
  const i = hermanos.findIndex((h) => h.id === id);
  if (i === -1 || !Number.isInteger(objetivo)) return hermanos;
  const h = hermanos[i];

  const nHon = contarBloque(hermanos, "HONORARIOS");
  const nTotal = hermanos.length - nHon;
  const esHonorario = h.bloque === "HONORARIOS";
  const enRango = esHonorario
    ? objetivo >= 1 && objetivo <= nHon
    : objetivo >= 1 && objetivo <= nTotal;
  if (!enRango) return hermanos;

  const sinEl = hermanos.filter((_, k) => k !== i);

  if (esHonorario) {
    // Dentro del tramo de honorarios: quedan objetivo-1 delante.
    const fin = sinEl.findIndex((x) => x.bloque !== "HONORARIOS");
    const limite = fin === -1 ? sinEl.length : fin;
    let destino = limite;
    let vistos = 0;
    for (let k = 0; k < limite; k++) {
      if (sinEl[k].bloque === "HONORARIOS") {
        vistos += 1;
        if (vistos === objetivo) {
          destino = k;
          break;
        }
      }
    }
    if (destino === limite && numerosPorBloque(hermanos)[i] === objetivo) {
      return hermanos;
    }
    const l = [...sinEl];
    l.splice(destino, 0, h);
    return l;
  }

  // El número es la posición dentro del tramo titular+suplente (nº impreso).
  // La línea del cupo cae tras el nº (cupo - nHon): por encima titular.
  const linea = cupo - nHon;
  const bloqueNuevo: Bloque = objetivo <= linea ? "TITULARES" : "SUPLENTES";
  if (numerosPorBloque(hermanos)[i] === objetivo && h.bloque === bloqueNuevo) {
    return hermanos;
  }

  let destino = sinEl.length;
  let vistos = 0;
  for (let k = 0; k < sinEl.length; k++) {
    if (sinEl[k].bloque !== "HONORARIOS") {
      vistos += 1;
      if (vistos === objetivo) {
        destino = k;
        break;
      }
    }
  }
  const l = [...sinEl];
  l.splice(destino, 0, { ...h, bloque: bloqueNuevo });
  return l;
}

/**
 * Archiva a un hermano: se saca de la lista activa y pasa a `archivados`
 * congelando el Nº que ocupaba y su bloque (titular/suplente/honorario).
 * Conserva todas sus cuotas y asistencias.
 */
export function archivarHermano(
  estado: Estado,
  id: string,
  numero: number
): Estado {
  const hermano = estado.hermanos.find((h) => h.id === id);
  if (!hermano) return estado;
  const archivado: HermanoArchivado = {
    id: hermano.id,
    nombre: hermano.nombre,
    bloque: hermano.bloque,
    telefono: hermano.telefono,
    notas: hermano.notas,
    numero,
    cuotas: { ...hermano.cuotas },
    asis: { ...hermano.asis },
  };
  return {
    ...estado,
    hermanos: estado.hermanos.filter((h) => h.id !== id),
    archivados: [...estado.archivados, archivado],
  };
}

/**
 * Reactiva a un hermano archivado: vuelve a la lista activa conservando sus
 * marcas, se quita del listado de archivados y se le asigna bloque y un nuevo
 * Nº inicial (el primero libre). El bloque se conserva del archivo.
 */
export function reactivarHermano(
  estado: Estado,
  id: string
): Estado {
  const archivado = estado.archivados.find((a) => a.id === id);
  if (!archivado) return estado;
  const activado: Hermano = {
    id: archivado.id,
    nombre: archivado.nombre,
    bloque: archivado.bloque,
    telefono: archivado.telefono,
    notas: archivado.notas,
    cuotas: { ...archivado.cuotas },
    asis: { ...archivado.asis },
  };
  const hermanos = estado.hermanos;
  let indice = hermanos.length;
  if (activado.bloque === "HONORARIOS") {
    indice = 0;
  } else if (activado.bloque === "TITULARES") {
    indice = hermanos.findIndex((h) => h.bloque !== "HONORARIOS");
    if (indice < 0) indice = hermanos.length;
  }
  const lista = [...hermanos];
  lista.splice(indice, 0, activado);
  return {
    ...estado,
    hermanos: lista,
    archivados: estado.archivados.filter((a) => a.id !== id),
  };
}

/** Borra definitivamente los archivados indicados: no se conserva nada. */
export function borrarArchivados(estado: Estado, ids: string[]): Estado {
  const fuera = new Set(ids);
  return { ...estado, archivados: estado.archivados.filter((a) => !fuera.has(a.id)) };
}
