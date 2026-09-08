import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import { PROCESIONES } from "../constants";
import { confirmar } from "../lib/dialogo";
import { leerFotos, type Alineable } from "../lib/foto";
import { archivarHermano, numerosPorBloque, siguienteCuota, siguienteMarca } from "../lib/modelo";
import type {
  Bloque,
  CfgImpresion,
  ClaveProcesion,
  Cuota,
  Estado,
  FilaLeida,
  Marca,
} from "../types";

export type ModoFoto = "asistencia" | "cuotas";
export type SeccionFoto = Bloque;

export interface VolcadoFotoHook {
  modo: ModoFoto;
  esCuotas: boolean;
  seccion: SeccionFoto;
  procesion: ClaveProcesion;
  anio: number;
  anios: number[];
  leyendo: boolean;
  errores: string[];
  acumulado: FilaLeida[];
  conMarca: number;
  conBaja: number;
  seleccionarModo: (m: ModoFoto) => void;
  seleccionarSeccion: (s: SeccionFoto) => void;
  seleccionarProcesion: (p: ClaveProcesion) => void;
  seleccionarAnio: (a: number) => void;
  elegirFotos: (files: FileList | null | undefined) => void;
  corregir: (id: string) => void;
  alternarBaja: (id: string) => void;
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

export function nombreProcesion(c: ClaveProcesion): string {
  return PROCESIONES.find((p) => p.clave === c)?.corto ?? c;
}

/**
 * Estado del modal de volcado por foto: qué modo/sección/año se lee, las filas
 * acumuladas de las páginas subidas y cómo se vuelcan a la lista (setEst).
 */
export function useVolcadoFoto(
  est: Estado,
  cfg: CfgImpresion,
  setEst: Dispatch<SetStateAction<Estado>>,
  onCerrar: () => void,
): VolcadoFotoHook {
  const columnas = useMemo(() => columnasMarca(cfg), [cfg]);
  const [modo, setModo] = useState<ModoFoto>("asistencia");
  const [seccion, setSeccion] = useState<SeccionFoto>("HONORARIOS");
  const [procesion, setProcesion] = useState<ClaveProcesion>("exc");
  const [anio, setAnio] = useState(columnas[0]?.anio ?? 0);
  const [leyendo, setLeyendo] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);
  const [acumulado, setAcumulado] = useState<FilaLeida[]>([]);

  const esCuotas = modo === "cuotas";
  const anios = esCuotas ? est.aniosCuotas : [...new Set(columnas.map((c) => c.anio))];

  const indiceColumna = columnas.findIndex(
    (c) => `${c.anio}_${c.procesion}` === `${anio}_${procesion}`
  );

  const lista = useMemo<Alineable[]>(() => {
    const numeros = numerosPorBloque(est.hermanos);
    return est.hermanos
      .map((h, i) => ({ id: h.id, n: numeros[i], nombre: h.nombre }))
      .filter((_, i) => est.hermanos[i].bloque === seccion);
  }, [est.hermanos, seccion]);

  const elegirFotos = async (files: FileList | null | undefined) => {
    const archivos = Array.from(files ?? []);
    if (!archivos.length) return;
    if (!esCuotas && indiceColumna < 0) return;
    setLeyendo(true);
    setErrores([]);
    try {
      const { filas, errores } = await leerFotos(archivos, lista, {
        indiceColumna,
        tipo: modo,
      });
      setErrores(errores);
      // Se acumulan páginas; si un mismo hermano sale en dos páginas, la última vale.
      setAcumulado((prev) => {
        const porId = new Map(prev.map((f) => [f.id, f]));
        for (const f of filas) porId.set(f.id, f);
        return [...porId.values()];
      });
    } catch (e) {
      setErrores([e instanceof Error ? e.message : "No he podido leer las fotos."]);
    } finally {
      setLeyendo(false);
    }
  };

  const corregir = (id: string) => {
    setAcumulado((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const marca = esCuotas
          ? siguienteCuota(f.marca as Cuota)
          : siguienteMarca(f.marca as Marca);
        return { ...f, marca: marca as Marca | Cuota };
      })
    );
  };

  const alternarBaja = (id: string) => {
    setAcumulado((prev) =>
      prev.map((f) => (f.id === id ? { ...f, quitar: f.quitar ? undefined : true } : f))
    );
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
      // Aplicar marcas/cuotas a los que no fueron tachados.
      return {
        ...estado,
        hermanos: estado.hermanos.map((h) => {
          const leida = acumulado.find((f) => f.id === h.id);
          if (!leida || leida.quitar) return h;
          if (esCuotas) {
            return { ...h, cuotas: { ...h.cuotas, [anio]: leida.marca as Cuota } };
          }
          const prev = h.asis?.[anio] ?? { exc: "" as Marca, sm: "" as Marca };
          return {
            ...h,
            asis: { ...h.asis, [anio]: { ...prev, [procesion]: leida.marca as Marca } },
          };
        }),
      };
    });
    onCerrar();
  };

  const conMarca = acumulado.filter((f) => f.marca && !f.quitar).length;
  const conBaja = acumulado.filter((f) => f.quitar).length;

  const desacumular = () => {
    setAcumulado([]);
    setErrores([]);
  };

  const seleccionarModo = (m: ModoFoto) => {
    setModo(m);
    desacumular();
    if (m === "cuotas") setAnio(est.aniosCuotas[0] ?? columnas[0]?.anio ?? 0);
    else setAnio(columnas[0]?.anio ?? 0);
  };

  const seleccionarSeccion = (s: SeccionFoto) => {
    setSeccion(s);
    desacumular();
  };

  return {
    modo,
    esCuotas,
    seccion,
    procesion,
    anio,
    anios,
    leyendo,
    errores,
    acumulado,
    conMarca,
    conBaja,
    seleccionarModo,
    seleccionarSeccion,
    seleccionarProcesion: setProcesion,
    seleccionarAnio: setAnio,
    elegirFotos,
    corregir,
    alternarBaja,
    guardar,
    descartar: desacumular,
  };
}