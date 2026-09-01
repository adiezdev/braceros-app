import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { Estado } from "../types";
import { api, ErrorApi } from "./api";
import type { Operacion } from "./api";
import { diferencias } from "./diff";

/** Espera antes de mandar, para que escribir un nombre no sea una petición por letra. */
const ESPERA_MS = 400;

/** Cada cuánto se pregunta si otra persona ha cambiado algo. */
const SONDEO_MS = 8_000;

export type Conexion = "cargando" | "guardado" | "guardando" | "error";

export interface EstadoRemoto {
  est: Estado | null;
  /** Misma firma que un useState normal: los componentes no notan la diferencia. */
  setEst: Dispatch<SetStateAction<Estado>>;
  /** Sustituye todo de golpe: cargar un Excel o restaurar la lista transcrita. */
  reemplazar: (nuevo: Estado) => void;
  conexion: Conexion;
  error: string | null;
  /** Vuelve a leer del servidor, tirando lo que hubiera pendiente. */
  recargar: () => void;
}

export function useEstado(): EstadoRemoto {
  const [est, setEstLocal] = useState<Estado | null>(null);
  const [conexion, setConexion] = useState<Conexion>("cargando");
  const [error, setError] = useState<string | null>(null);

  // El estado también vive en una ref porque el diff necesita el valor
  // anterior fuera del render. Hacerlo dentro del updater de useState no
  // vale: StrictMode lo invoca dos veces y se enviaría todo por duplicado.
  const actual = useRef<Estado | null>(null);
  const version = useRef(0);
  const cola = useRef<Operacion[]>([]);
  const enviando = useRef(false);
  const temporizador = useRef<number | null>(null);
  // Indirección para que programar() no dependa de enviar(), que a su vez
  // necesita programar() para reintentar. Rompe el ciclo sin trucos de orden.
  const enviarRef = useRef<() => void>(() => {});

  const cargar = useCallback(async () => {
    try {
      const r = await api.estado();
      actual.current = r.estado;
      version.current = r.version;
      setEstLocal(r.estado);
      setConexion("guardado");
      setError(null);
    } catch (e) {
      setConexion("error");
      setError(e instanceof ErrorApi ? e.message : "No he podido cargar los datos.");
    }
  }, []);

  const programar = useCallback(() => {
    if (temporizador.current !== null) window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => {
      temporizador.current = null;
      enviarRef.current();
    }, ESPERA_MS);
  }, []);

  const enviar = useCallback(async () => {
    if (enviando.current || !cola.current.length) return;

    const lote = cola.current;
    cola.current = [];
    enviando.current = true;
    setConexion("guardando");

    try {
      const r = await api.cambios(lote);
      version.current = r.version;
      setError(null);
      setConexion(cola.current.length ? "guardando" : "guardado");
    } catch (e) {
      // Vuelven al principio de la cola para reintentar, sin perder el orden
      // respecto a lo que haya entrado mientras estaban en vuelo.
      cola.current = [...lote, ...cola.current];
      setConexion("error");
      setError(e instanceof ErrorApi ? e.message : "No he podido guardar.");
    } finally {
      enviando.current = false;
      if (cola.current.length) programar();
    }
  }, [programar]);

  useEffect(() => {
    enviarRef.current = () => void enviar();
  }, [enviar]);

  const encolar = useCallback(
    (ops: Operacion[]) => {
      if (!ops.length) return;
      cola.current.push(...ops);
      setConexion("guardando");
      programar();
    },
    [programar]
  );

  const setEst = useCallback<Dispatch<SetStateAction<Estado>>>(
    (accion) => {
      const previo = actual.current;
      if (!previo) return; // aún cargando: no hay nada con lo que comparar

      const siguiente =
        typeof accion === "function" ? (accion as (p: Estado) => Estado)(previo) : accion;
      if (siguiente === previo) return;

      actual.current = siguiente;
      setEstLocal(siguiente);
      encolar(diferencias(previo, siguiente));
    },
    [encolar]
  );

  const reemplazar = useCallback(
    (nuevo: Estado) => {
      actual.current = nuevo;
      setEstLocal(nuevo);
      // Lo pendiente ya no vale: esto lo sobrescribe todo igualmente.
      cola.current = [{ tipo: "reemplazar", estado: nuevo }];
      setConexion("guardando");
      programar();
    },
    [programar]
  );

  const recargar = useCallback(() => {
    cola.current = [];
    setConexion("cargando");
    void cargar();
  }, [cargar]);

  /* --- carga inicial ------------------------------------------------ */
  useEffect(() => {
    void cargar();
  }, [cargar]);

  /* --- sondeo de cambios ajenos ------------------------------------- */
  useEffect(() => {
    const id = window.setInterval(() => {
      // Solo se recarga sobre terreno firme: nada pendiente de guardar,
      // pestaña visible y carga inicial hecha.
      if (cola.current.length || enviando.current) return;
      if (document.hidden || !actual.current) return;

      void api
        .version()
        .then(({ version: v }) => {
          if (v !== version.current) return cargar();
        })
        .catch(() => {
          /* el sondeo es best-effort: si falla, ya avisará el guardado */
        });
    }, SONDEO_MS);

    return () => window.clearInterval(id);
  }, [cargar]);

  /* --- no perder lo pendiente al cerrar ------------------------------ */
  useEffect(() => {
    const alSalir = (e: BeforeUnloadEvent) => {
      if (cola.current.length || enviando.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", alSalir);
    return () => {
      window.removeEventListener("beforeunload", alSalir);
      if (temporizador.current !== null) window.clearTimeout(temporizador.current);
    };
  }, []);

  return { est, setEst, reemplazar, conexion, error, recargar };
}
