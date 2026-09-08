import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";

import { ANIO_BASE } from "../constants";
import { descargarLibro, leerLibro } from "../lib/libro";
import { avisar, confirmar, preguntar } from "../lib/dialogo";
import { crearHermano, estadoInicial } from "../lib/modelo";
import { notificar } from "../lib/toast";
import type { CfgImpresion, Estado } from "../types";

interface Props {
  est: Estado | null;
  setEst: Dispatch<SetStateAction<Estado>>;
  reemplazar: (nuevo: Estado) => void;
  setCfg: Dispatch<SetStateAction<CfgImpresion>>;
}

/** Acciones de la aplicación: importar/exportar Excel, restaurar, hermanos y años. */
export function useAccionesApp({ est, setEst, reemplazar, setCfg }: Props) {
  const importar = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      try {
        const buf = await file.arrayBuffer();
        const nuevo = await leerLibro(new Uint8Array(buf));
        if (!nuevo.hermanos.length) {
          notificar("La hoja Hermanos no tiene ningún nombre.", "error");
          return;
        }
        const ok = await confirmar(
          `Esto sustituye la lista del servidor por los ${nuevo.hermanos.length} hermanos del Excel, para todo el mundo. ¿Sigo?`
        );
        if (!ok) return;
        reemplazar({ ...nuevo, archivados: est?.archivados ?? [] });
        const ultimo = Math.max(...nuevo.aniosAsis, ...nuevo.aniosCuotas);
        setCfg((c) => ({ ...c, anioAnterior: ultimo, aniosNuevos: [ultimo + 1] }));
        notificar("Excel cargado", "ok", `${nuevo.hermanos.length} hermanos y los años ${nuevo.aniosAsis.join(", ")}.`);
      } catch (e) {
        notificar("No he podido leer el fichero", "error", e instanceof Error ? e.message : undefined);
      }
    },
    [reemplazar, setCfg, est]
  );

  const exportar = useCallback(async () => {
    if (!est) return;
    try {
      await descargarLibro(est);
      notificar("Excel descargado");
    } catch (e) {
      notificar("No he podido generar el Excel", "error", e instanceof Error ? e.message : undefined);
    }
  }, [est]);

  const restaurar = useCallback(async () => {
    const ok = await confirmar(
      "¿Volver a la lista transcrita de las hojas? Se pierde lo apuntado en el servidor, para todo el mundo."
    );
    if (!ok) return;
    reemplazar({ ...estadoInicial(), archivados: est?.archivados ?? [] });
    notificar("Lista restaurada", "ok", "Tal como se transcribió de las hojas.");
  }, [reemplazar, est]);

  const anadirHermano = useCallback(
    () => setEst((p) => ({ ...p, hermanos: [...p.hermanos, crearHermano()] })),
    [setEst]
  );

  const anadirAnio = useCallback(
    async (cual: "cuotas" | "asistencias") => {
      if (!est) return;
      const clave = cual === "cuotas" ? "aniosCuotas" : "aniosAsis";
      const lista = est[clave];
      const sugerido = (lista.length ? Math.max(...lista) : ANIO_BASE) + 1;
      const entrar = await preguntar("¿Qué año quieres añadir?", String(sugerido));
      if (entrar === null) return;
      const anio = Number(entrar);
      if (!Number.isInteger(anio) || anio < 1900 || anio > 2200) {
        await avisar("Ese no parece un año válido.");
        return;
      }
      if (lista.includes(anio)) {
        await avisar(`El año ${anio} ya está.`);
        return;
      }
      setEst({ ...est, [clave]: [...lista, anio].sort((a, b) => a - b) });
    },
    [est, setEst]
  );

  const quitarAnio = useCallback(
    async (cual: "cuotas" | "asistencias", anio: number) => {
      const que = cual === "cuotas" ? "las cuotas" : "las asistencias";
      const ok = await confirmar(`¿Quitar ${que} de ${anio}? Se borran esas marcas.`);
      if (!ok) return;
      setEst((p) => {
        const clave = cual === "cuotas" ? "aniosCuotas" : "aniosAsis";
        return {
          ...p,
          [clave]: p[clave].filter((a) => a !== anio),
          hermanos: p.hermanos.map((h) => {
            const cuotas = { ...h.cuotas };
            const asis = { ...h.asis };
            if (cual === "cuotas") delete cuotas[anio];
            else delete asis[anio];
            return { ...h, cuotas, asis };
          }),
        };
      });
    },
    [setEst]
  );

  return { importar, exportar, restaurar, anadirHermano, anadirAnio, quitarAnio };
}