import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import { PROCESIONES } from "../constants";
import { confirmar } from "../lib/dialogo";
import { alinear, normalizarNombre, type Alineable } from "../lib/alinear";
import { leerFotos, type FilaBruta } from "../lib/foto";
import {
  archivarHermano,
  crearHermano,
  numerosPorBloque,
  siguienteCuota,
  siguienteMarca,
} from "../lib/modelo";
import type {
  CfgImpresion,
  ClaveProcesion,
  Cuota,
  Estado,
  FilaLeida,
  Marca,
} from "../types";

export type ModoFoto = "asistencia" | "cuotas";

/** Una columna de marcas elegida para leer: a qué año/procesión corresponde y
    dónde está en el papel (0 = columna del Nº). */
export interface ColumnaSeleccion {
  anio: number;
  /** Solo asistencia: exaltación o San Martín. */
  procesion?: ClaveProcesion;
  /** Índice de la columna de marcas en la hoja (0-based). */
  indice: number;
}

export interface VolcadoFotoHook {
  modo: ModoFoto;
  esCuotas: boolean;
  columnas: ColumnaSeleccion[];
  leyendo: boolean;
  errores: string[];
  /** Nombres de la hoja que no están en la lista actual, sin resolver aún. */
  omitidos: string[];
  /** Lista actual (Nº y nombre de cada hermano), para emparejar omitidos. */
  lista: Alineable[];
  acumulado: FilaLeida[];
  conMarca: number;
  conBaja: number;
  seleccionarModo: (m: ModoFoto) => void;
  anadirColumna: () => void;
  quitarColumna: (i: number) => void;
  cambiarColumna: (i: number, patch: Partial<ColumnaSeleccion>) => void;
  elegirFotos: (files: FileList | null | undefined) => void;
  corregir: (id: string, columna: number) => void;
  alternarBaja: (id: string) => void;
  /** Da de alta un nombre de la hoja en la lista (en Suplentes por defecto). */
  anadir: (nombre: string) => void;
  /** Une un nombre de la hoja a un hermano existente (errata/apellido). */
  emparejar: (nombre: string, idHermano: string) => void;
  guardar: () => void;
  descartar: () => void;
}

/** Orden de columnas de marcas de asistencia tal y como salen en la hoja impresa. */
function columnasMarca(cfg: CfgImpresion): { anio: number; procesion: ClaveProcesion }[] {
  return [
    { anio: cfg.anioAnterior, procesion: "exc" as ClaveProcesion },
    { anio: cfg.anioAnterior, procesion: "sm" as ClaveProcesion },
    ...cfg.aniosNuevos.flatMap((a) => [
      { anio: a, procesion: "exc" as ClaveProcesion },
      { anio: a, procesion: "sm" as ClaveProcesion },
    ]),
  ];
}

/** Las columnas que imprime la hoja actual: arranque por defecto, editables. */
function columnasDeLaHoja(cfg: CfgImpresion, m: ModoFoto): ColumnaSeleccion[] {
  if (m === "cuotas") {
    return [
      { anio: cfg.anioAnterior, indice: 1 },
      ...cfg.aniosNuevos.map((a, i) => ({ anio: a, indice: 2 + i })),
    ];
  }
  return columnasMarca(cfg).map((c, i) => ({
    anio: c.anio,
    procesion: c.procesion,
    indice: i + 1,
  }));
}

export function nombreProcesion(c: ClaveProcesion): string {
  return PROCESIONES.find((p) => p.clave === c)?.corto ?? c;
}

/**
 * Estado del modal de volcado por foto: qué columnas de marcas se leen (pueden
 * ser varias a la vez, sin límite de año), las filas acumuladas de las páginas
 * subidas y cómo se vuelcan a la lista (setEst).
 */
export function useVolcadoFoto(
  est: Estado,
  cfg: CfgImpresion,
  setEst: Dispatch<SetStateAction<Estado>>,
  onCerrar: () => void,
): VolcadoFotoHook {
  const [modo, setModo] = useState<ModoFoto>("asistencia");
  const [columnas, setColumnas] = useState<ColumnaSeleccion[]>(() =>
    columnasDeLaHoja(cfg, "asistencia"),
  );
  const [leyendo, setLeyendo] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);
  /** Filas crudas leídas de las fotos (todas las páginas). */
  const [brutas, setBrutas] = useState<FilaBruta[]>([]);
  /** Correcciones a mano: nombre de la hoja → id del hermano al que pertenece. */
  const [parejas, setParejas] = useState<Record<string, string>>({});
  /** Marcas/tachado ajustadas a mano por hermano (persisten al realinear). */
  const [ajustes, setAjustes] = useState<Record<string, { marcas: (Marca | Cuota)[]; quitar?: boolean }>>({});

  const esCuotas = modo === "cuotas";

  const lista = useMemo<Alineable[]>(() => {
    const numeros = numerosPorBloque(est.hermanos);
    return est.hermanos.map((h, i) => ({ id: h.id, n: numeros[i]!, nombre: h.nombre }));
  }, [est.hermanos]);

  // Alineación derivada: los nombres de la hoja que el usuario ha emparejado a
  // un hermano existente (errata/apellido mal) se casan por id, así sus marcas
  // caen en la persona correcta.
  const alineado = useMemo(() => {
    const parejasNormalizadas = Object.fromEntries(
      Object.entries(parejas).map(([n, id]) => [normalizarNombre(n), id]),
    );
    return alinear(brutas, lista, parejasNormalizadas);
  }, [brutas, lista, parejas]);

  // La tabla de revisión, con las correcciones a mano por encima.
  const acumulado = useMemo<FilaLeida[]>(
    () => alineado.filas.map((f) => (ajustes[f.id] ? { ...f, ...ajustes[f.id] } : f)),
    [alineado, ajustes],
  );

  const omitidos = useMemo<string[]>(() => [...new Set(alineado.omitidos)], [alineado.omitidos]);

  const elegirFotos = async (files: FileList | null | undefined) => {
    const archivos = Array.from(files ?? []);
    if (!archivos.length || !columnas.length) return;
    setLeyendo(true);
    setErrores([]);
    try {
      const { crudas, errores } = await leerFotos(archivos, {
        columnas: columnas.map((c) => c.indice),
        tipo: modo,
      });
      setErrores(errores);
      setBrutas((prev) => [...prev, ...crudas]);
    } catch (e) {
      setErrores([e instanceof Error ? e.message : "No he podido leer las fotos."]);
    } finally {
      setLeyendo(false);
    }
  };

  const corregir = (id: string, columna: number) => {
    setAjustes((prev) => {
      const celdaActual =
        prev[id]?.marcas[columna] ??
        (acumulado.find((f) => f.id === id)?.marcas[columna] as Marca | Cuota | undefined) ??
        "";
      const marcas = [...(prev[id]?.marcas ?? acumulado.find((f) => f.id === id)?.marcas ?? [])];
      while (marcas.length <= columna) marcas.push("");
      marcas[columna] = (esCuotas ? siguienteCuota(celdaActual as Cuota) : siguienteMarca(celdaActual as Marca)) as
        | Marca
        | Cuota;
      return { ...prev, [id]: { marcas, quitar: prev[id]?.quitar } };
    });
  };

  const alternarBaja = (id: string) => {
    setAjustes((prev) => {
      const base = acumulado.find((f) => f.id === id);
      const quitar = prev[id] ? !prev[id].quitar : !(base?.quitar ?? false);
      return {
        ...prev,
        [id]: { marcas: prev[id]?.marcas ?? base?.marcas ?? [], quitar },
      };
    });
  };

  const anadir = (nombre: string) => {
    const normal = normalizarNombre(nombre);
    if (!normal) return;
    if (lista.some((l) => normalizarNombre(l.nombre) === normal)) return;
    setEst((p) => ({ ...p, hermanos: [...p.hermanos, crearHermano({ nombre })] }));
  };

  const emparejar = (nombre: string, idHermano: string) => {
    setParejas((prev) => {
      const copia = { ...prev };
      if (idHermano) copia[nombre] = idHermano;
      else delete copia[nombre];
      return copia;
    });
  };

  const guardar = async () => {
    if (!acumulado.length) return;
    const bajas = acumulado.filter((f) => f.quitar);
    if (bajas.length) {
      const ok = await confirmar(
        `${bajas.length > 1 ? `${bajas.length} hermanos están tachados` : `${bajas[0].nombre} está tachado`}: se quitan de la lista para todo el mundo. ¿Sigo?`
      );
      if (!ok) return;
    }
    const idsBaja = new Set(bajas.map((f) => f.id));
    setEst((p) => {
      // Archivar tachados con su número de bloque congelado.
      const numeros = numerosPorBloque(p.hermanos);
      let estado = p;
      p.hermanos.forEach((h, i) => {
        if (idsBaja.has(h.id)) estado = archivarHermano(estado, h.id, numeros[i]);
      });
      // Aplicar marcas/cuotas de TODAS las columnas elegidas a los que no
      // fueron tachados, y apuntar los años aunque no estuvieran en la lista
      // (p. ej. lecturas de años anteriores).
      const aniosDe = columnas.map((c) => c.anio);
      const registraAnios = (anios: number[]) => {
        const nuevos = aniosDe.filter((a) => !anios.includes(a));
        return nuevos.length ? [...anios, ...nuevos].sort((a, b) => a - b) : anios;
      };
      return {
        ...estado,
        aniosCuotas: esCuotas ? registraAnios(estado.aniosCuotas) : estado.aniosCuotas,
        aniosAsis: esCuotas ? estado.aniosAsis : registraAnios(estado.aniosAsis),
        hermanos: estado.hermanos.map((h) => {
          const leida = acumulado.find((f) => f.id === h.id);
          if (!leida || leida.quitar) return h;
          const cuotas = { ...h.cuotas };
          const asis = { ...h.asis };
          columnas.forEach((c, j) => {
            const celda = (leida.marcas[j] ?? "") as Marca | Cuota;
            if (esCuotas) {
              cuotas[c.anio] = celda as Cuota;
            } else {
              const prev = asis[c.anio] ?? { exc: "" as Marca, sm: "" as Marca };
              asis[c.anio] = { ...prev, [c.procesion ?? "exc"]: celda as Marca };
            }
          });
          return { ...h, cuotas, asis };
        }),
      };
    });
    onCerrar();
  };

  const conMarca = acumulado.filter((f) => f.marcas.some((m) => m) && !f.quitar).length;
  const conBaja = acumulado.filter((f) => f.quitar).length;

  const desacumular = () => {
    setBrutas([]);
    setErrores([]);
    setParejas({});
    setAjustes({});
  };

  const seleccionarModo = (m: ModoFoto) => {
    setModo(m);
    desacumular();
    setColumnas(columnasDeLaHoja(cfg, m));
  };

  const anadirColumna = () => {
    setColumnas((prev) => {
      const u = prev[prev.length - 1];
      const indice = (u?.indice ?? 0) + 1;
      const base = u ?? (esCuotas ? { anio: cfg.anioAnterior, indice } : { anio: cfg.anioAnterior, procesion: "exc" as ClaveProcesion, indice });
      return [...prev, { ...base, indice }];
    });
  };

  const quitarColumna = (i: number) => {
    setColumnas((prev) => prev.filter((_, k) => k !== i));
  };

  const cambiarColumna = (i: number, patch: Partial<ColumnaSeleccion>) => {
    setColumnas((prev) => prev.map((c, k) => (k === i ? { ...c, ...patch } : c)));
  };

  return {
    modo,
    esCuotas,
    columnas,
    leyendo,
    errores,
    omitidos,
    lista,
    acumulado,
    conMarca,
    conBaja,
    seleccionarModo,
    anadirColumna,
    quitarColumna,
    cambiarColumna,
    elegirFotos,
    corregir,
    alternarBaja,
    anadir,
    emparejar,
    guardar,
    descartar: desacumular,
  };
}