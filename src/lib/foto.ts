import type { FilaApi } from "../services/foto.service";
import { leerFoto } from "../services/foto.service";

/**
 * Volcado por foto. La hoja impresa trae una tabla en la que cada fila es un
 * hermano y, a lo ancho, las columnas de asistencias de cada año y procesión
 * (V asistió · F falta · FJ falta justificada).
 *
 * La imagen se redimensiona en el navegador y se sube a la API del proyecto
 * (services/foto.service.ts), que es quien la manda a un modelo de IA (Gemini)
 * con la clave guardada en el servidor. La API devuelve por cada fila su Nº,
 * nombre y marcas, y aquí se dejan sin alinear: la alineación la hace el hook,
 * que re-alinea cuando el usuario añade a la lista o arregla un nombre.
 */
export type { Alineable } from "./alinear";

/** Fila tal y como sale de la IA: sin emparejar todavía con la lista. */
export type FilaBruta = FilaApi;

/** Anchura máxima del lado largo tras redimensionar (controla el tamaño subido). */
const ANCHO_MAX = 2000;
/** Cuánto pesar (calidad JPEG) la imagen antes de subirla. */
const CALIDAD_JPG = 0.85;

/**
 * Lee un fichero de imagen y lo deja en base64 JPEG reescalado a ANCHO_MAX.
 * Redimensionar antes de subir sirve para no pasarse del límite del servidor
 * y para que la petición tarde menos.
 */
/**
 * Deja la foto en base64 JPEG para la API. Los HEIC (iPhone) no los descodifica
 * <img> en Chrome: se pasan por heic2any (WASM). Si el WASM tampoco los
 * entiende (HEIC modernos), se suben crudos con mime "image/heic": Gemini los
 * lee directo.
 */
async function aJpeg(file: File): Promise<{ base64: string; mime: string }> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const esHeic =
    /\.(heic|heif)$/i.test(file.name) ||
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    esHeicBytes(bytes);
  if (!esHeic) return aBase64(file);
  try {
    const jpeg = await convertirHeic(file);
    return aBase64(jpeg instanceof File ? jpeg : new File([jpeg], file.name, { type: "image/jpeg" }));
  } catch {
    return { base64: base64De(bytes), mime: "image/heic" };
  }
}

function esHeicBytes(v: Uint8Array): boolean {
  return (
    v[4] === 0x66 &&
    v[5] === 0x74 &&
    v[6] === 0x79 &&
    v[7] === 0x70 && // "ftyp"
    (v[8] === 0x68 || v[8] === 0x6d) // marca de tipo "he…" o "mi…"
  );
}

function base64De(v: Uint8Array): string {
  let s = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < v.length; i += CHUNK) {
    s += String.fromCharCode(...v.subarray(i, i + CHUNK));
  }
  return btoa(s);
}

function aBase64(blob: Blob): Promise<{ base64: string; mime: string }> {
  const url = URL.createObjectURL(blob);
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const escala = Math.min(1, ANCHO_MAX / img.naturalWidth);
      const w = Math.max(1, Math.round(img.naturalWidth * escala));
      const h = Math.max(1, Math.round(img.naturalHeight * escala));
      const cv = document.createElement("canvas");
      cv.width = w;
      cv.height = h;
      const ctx = cv.getContext("2d");
      if (!ctx) return rej(new Error("No puedo procesar esta foto."));
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      res({ base64: cv.toDataURL("image/jpeg", CALIDAD_JPG).split(",")[1]!, mime: "image/jpeg" });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      rej(new Error("No he podido abrir la foto."));
    };
    img.src = url;
  });
}

async function convertirHeic(file: File): Promise<Blob> {
  const { default: heic2any } = await import("heic2any");
  const salida = await heic2any({ blob: file, toType: "image/jpeg", quality: CALIDAD_JPG });
  const una = Array.isArray(salida) ? salida[0] : salida;
  if (!una) throw new Error("No he podido convertir la foto HEIC.");
  return una;
}

export interface ResultadoLectura {
  /** Filas leídas, SIN alinear: emparejarlas lo decide la UI (añadir o corregir un nombre). */
  crudas: FilaBruta[];
  errores: string[];
}

export interface OpcionesLectura {
  /** Índices (0-based) de las columnas de marcas a leer, todas a la vez. */
  columnas: number[];
  /** Tipo de foto: asistencia (V/F/FJ) o cuotas (S/N). */
  tipo: "asistencia" | "cuotas";
}

/**
 * Lee varias fotos (una por página) y devuelve las filas crudas de todas junto
 * con los errores por foto (si una no se lee, el resto sigue).
 */
export async function leerFotos(
  archivos: File[],
  opciones: OpcionesLectura
): Promise<ResultadoLectura> {
  const resultados = await Promise.allSettled(
    archivos.map(async (f) => {
      const { base64, mime } = await aJpeg(f);
      return leerFoto(base64, opciones.columnas, opciones.tipo, mime);
    })
  );

  const crudas: FilaBruta[] = [];
  const errores: string[] = [];
  resultados.forEach((r, i) => {
    if (r.status === "fulfilled") {
      crudas.push(...r.value);
    } else {
      const nombre = archivos[i]?.name ?? `foto ${i + 1}`;
      errores.push(`${nombre}: ${r.reason instanceof Error ? r.reason.message : "no se ha leído."}`);
    }
  });

  return { crudas, errores };
}