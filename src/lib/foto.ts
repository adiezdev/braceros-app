import type { Cuota, FilaLeida, Marca } from "../types";
import { leerFoto } from "../services/foto.service";

/**
 * Volcado por foto. La hoja impresa trae una tabla en la que cada fila es un
 * hermano y, a lo ancho, las columnas de asistencias de cada año y procesión
 * (V asistió · F falta · FJ falta justificada).
 *
 * La imagen se redimensiona en el navegador y se sube a la API del proyecto
 * (services/foto.service.ts), que es quien la manda a un modelo de IA (Gemini)
 * con la clave guardada en el servidor. La API devuelve por cada fila su Nº y
 * su marca, y aquí se alinea contra la lista de hermanos.
 */

/** Anchura máxima del lado largo tras redimensionar (controla el tamaño subido). */
const ANCHO_MAX = 2000;
/** Cuánto pesar (calidad JPEG) la imagen antes de subirla. */
const CALIDAD_JPG = 0.85;

export interface Alineable {
  id: string;
  /** Puesto impreso (1..N), coincide con el orden de la lista. */
  n: number;
  nombre: string;
}

/** Devuelve la marca para la revisión: vacías en automático, el resto a repasar. */
function confianzaDe(marca: Marca | Cuota): number {
  return marca ? 0.5 : 1;
}

/**
 * Lee un fichero de imagen y lo deja en base64 JPEG reescalado a ANCHO_MAX.
 * Redimensionar antes de subir sirve para no pasarse del límite del servidor
 * y para que la petición tarde menos.
 */
function aBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
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
      res(cv.toDataURL("image/jpeg", CALIDAD_JPG).split(",")[1]!);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      rej(new Error("No he podido abrir la foto."));
    };
    img.src = url;
  });
}

/**
 * Alinea las filas transcritas (con su Nº impreso) contra la lista de hermanos
 * y devuelve `FilaLeida` en el orden de la lista. Las filas cuyo Nº no existe
 * en la lista se descartan (no debería pasar con una hoja correcta).
 */
export function alinear(
  filas: { n: number; marca: Marca | Cuota }[],
  lista: Alineable[]
): FilaLeida[] {
  const porN = new Map(lista.map((l) => [l.n, l]));
  const resultado: FilaLeida[] = [];
  for (const f of filas) {
    const base = porN.get(f.n);
    if (!base) continue;
    resultado.push({
      id: base.id,
      n: base.n,
      nombre: base.nombre,
      marca: f.marca,
      confianza: confianzaDe(f.marca),
    });
  }
  // Devolvemos en el orden de la lista para que la revisión sea cómoda.
  const porId = new Map(resultado.map((f) => [f.id, f]));
  return lista.filter((l) => porId.has(l.id)).map((l) => porId.get(l.id)!);
}

export interface ResultadoLectura {
  filas: FilaLeida[];
  errores: string[];
}

export interface OpcionesLectura {
  /** Índice (0-based) de la columna de marcas (asistencia). */
  indiceColumna: number;
  /** Tipo de foto: asistencia (V/F/FJ) o cuotas (S/N). */
  tipo: "asistencia" | "cuotas";
}

/**
 * Lee varias fotos (una por página) y devuelve todas las filas alineadas junto
 * con los errores por foto. Se procesan en paralelo; si una foto no se lee,
 * el resto sigue y eso se cuenta en `errores`.
 */
export async function leerFotos(
  archivos: File[],
  lista: Alineable[],
  opciones: OpcionesLectura
): Promise<ResultadoLectura> {
  const resultados = await Promise.allSettled(
    archivos.map(async (f) => {
      const base64 = await aBase64(f);
      const filas = await leerFoto(base64, opciones.indiceColumna, opciones.tipo);
      return alinear(filas, lista);
    })
  );

  const filas: FilaLeida[] = [];
  const errores: string[] = [];
  resultados.forEach((r, i) => {
    if (r.status === "fulfilled") {
      filas.push(...r.value);
    } else {
      const nombre = archivos[i]?.name ?? `foto ${i + 1}`;
      errores.push(`${nombre}: ${r.reason instanceof Error ? r.reason.message : "no se ha leído."}`);
    }
  });

  return { filas, errores };
}