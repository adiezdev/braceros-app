import { sileo, type SileoOptions } from "sileo";

/** Marca del conjunto: burdeos para estructura, rojo faltas, verde asistencias.
 *  Valores fijos — los toasts se renderizan fuera del DOM tree de .app y no
 *  heredan los tokens CSS. Se mantienen sincronizados con tokens.css. */
const FILL_OK = "#2F5A3D";
const FILL_INFO = "#7A1F2B";
const FILL_ERROR = "#C0392B";

/** Los toasts repetidos seguidos (mismo título, p. ej. un guardado tras otro)
    se agrupan en silencio para no inundar mientras se teclea un nombre. */
const QUIETO_MS = 3_000;
let ultimoTitulo = "";
let ultimaVez = 0;

export function notificar(
  mensaje: string,
  tipo: "ok" | "info" | "error" = "ok",
  detalle?: string,
) {
  const ahora = Date.now();
  if (tipo === "ok" && mensaje === ultimoTitulo && ahora - ultimaVez < QUIETO_MS) return;
  ultimoTitulo = tipo === "ok" ? mensaje : "";
  ultimaVez = ahora;

  const base: SileoOptions = { duration: 2_500, roundness: 8 };
  if (tipo === "ok") sileo.success({ ...base, title: mensaje, fill: FILL_OK, description: detalle });
  else if (tipo === "info")
    sileo.info({ ...base, title: mensaje, fill: FILL_INFO, description: detalle });
  else sileo.error({ ...base, title: mensaje, fill: FILL_ERROR, description: detalle });
}

export function promesaDe<T>(
  tarea: Promise<T>,
  cargando: string,
  titulo: (dato: T) => string,
): Promise<T> {
  return sileo.promise(tarea, {
    loading: { title: cargando },
    success: (dato) => ({ title: titulo(dato), duration: 2_500, roundness: 8 }),
    error: (error) => ({
      title: "Algo no ha ido bien",
      description: error instanceof Error ? error.message : String(error),
    }),
  });
}