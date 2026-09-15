import { CUOTAS, MARCAS } from "./tipos.js";
import type { Cuota, Marca } from "./tipos.js";
import { ErrorPeticion } from "./operaciones.js";

/**
 * Volcado por foto: llama a la API de Google Gemini para transcribir la tabla
 * de asistencias de una foto.
 *
 * El motivo de hacer el proxy aquí (y no llamar a Gemini desde el navegador)
 * es que la API key no debe llegar nunca al frontend: la guardamos como
 * variable de entorno en el servidor, igual que DATABASE_URL.
 *
 * La foto sale al exterior a Google. Eso se aceptó expresamente; aquí solo
 * dejamos constancia de que los datos de la foto (que pueden mostrar nombres
 * y teléfonos de los hermanos) viajan a un tercero.
 */

const MODELO = process.env.GEMINI_MODELO ?? "gemini-3.5-flash-lite";
const URL = (key: string, modelo: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${encodeURIComponent(key)}`;

export interface FilaTranscrita {
  n: number;
  /** Nombre tal y como aparece escrito en la hoja (para alinear contra la lista actual). */
  nombre?: string;
  /** Marcas leídas, en el MISMO ORDEN que la lista de columnas pedida. */
  marcas: Marca[];
  /** true solo si el NOMBRE COMPLETO está atravesado por una línea: el hermano
      se da de baja. Una marquita al lado del nombre NO es un tachado. */
  quitar?: boolean;
}

export type TipoFoto = "asistencia" | "cuotas";

/**
 * Adivina el MIME de una foto en base64 sin depender del cliente: se fija en
 * los primeros bytes (los JPEG empiezan por ´ÿØÿ`, los HEIC por "ftyp"+"heic").
 */
function mimeDe(b64: string): string {
  try {
    const bytes = new Uint8Array(Buffer.from(b64, "base64").subarray(0, 12));
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
    if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
      const marca = String.fromCharCode(bytes[8] ?? 0, bytes[9] ?? 0);
      if (marca === "he" || marca === "mi") return "image/heic";
    }
  } catch {
    /* MIME desconocido: Gemini lo ve como image/jpeg y avisará si no puede. */
  }
  return "image/jpeg";
}

/**
 * Transcribe una foto. `imagenBase64` es el JPEG (o HEIC/PNG) en base64 de
 * una sola página. `columnas` son los índices (0-based) de las columnas de
 * marcas a leer, todas en la MISA llamada a Gemini (una sola foto, un solo
 * prompt: gastamos una sola vez el coste de la imagen). `mime` (image/jpeg,
 * image/heic, …) se lo decimos a Gemini; si no viene, se intenta adivinar
 * porque el código que subió la foto no lo sabía (cliente viejo). `tipo`
 * indica qué leer: asistencia (V/F/FJ) o cuotas (S/N).
 */
export async function transcribir(
  imagenBase64: string,
  columnas: number[],
  tipo: TipoFoto = "asistencia",
  mime?: string
): Promise<FilaTranscrita[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new ErrorPeticion(
      "El volcado por foto no está disponible: el servidor no tiene GEMINI_API_KEY.",
      503
    );
  }

  if (typeof imagenBase64 !== "string" || imagenBase64.length < 100) {
    throw new ErrorPeticion("la foto no ha llegado entera");
  }
  if (
    !Array.isArray(columnas) ||
    !columnas.length ||
    !columnas.every((c) => Number.isInteger(c) && c >= 0 && c <= 30)
  ) {
    throw new ErrorPeticion("columnas de marcas inválidas");
  }

  const prompt = tipo === "cuotas" ? promptCuotas(columnas) : promptAsistencia(columnas);

  const body = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mime ?? mimeDe(imagenBase64),
              data: imagenBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 2048,
    },
  };

  let respuesta: Response;
  try {
    respuesta = await fetch(URL(key, MODELO), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ErrorPeticion("No he podido llamar al reconocedor de texto (Gemini).", 502);
  }

  if (!respuesta.ok) {
    const txt = await respuesta.text().catch(() => "");
    if (respuesta.status === 400 || respuesta.status === 404) {
      throw new ErrorPeticion(
        `Gemini rechazó la petición (${respuesta.status}). Revisa el modelo y la clave.`,
        502
      );
    }
    throw new ErrorPeticion(
      `Gemini respondió ${respuesta.status}${txt ? `: ${txt.slice(0, 120)}` : ""}`,
      502
    );
  }

  const datos = (await respuesta.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const texto = datos.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("") ?? "";

  const marcasValidas = tipo === "cuotas" ? CUOTAS : MARCAS;
  const alias: Record<string, string> =
    tipo === "cuotas"
      ? { P: "S", X: "S", "": "N" }
      : { X: "F" };
  const filas = parsear(texto, marcasValidas, alias, columnas.length);
  if (!filas.length) {
    throw new ErrorPeticion("Gemini no ha sabido leer la tabla de la foto. Repite la foto.", 422);
  }
  return filas;
}

/** Describe las columnas pedidas para el prompt: "1, 3 y 4". */
function listaColumnas(columnas: number[]): string {
  if (columnas.length === 1) return `la ${columnas[0]}`;
  return `las ${columnas.slice(0, -1).join(", ")} y ${columnas[columnas.length - 1]}`;
}

/** Prompt para asistencia (V/F/FJ): lee todas las columnas de marcas a la vez. */
function promptAsistencia(columnas: number[]): string {
  return (
    "Eres un lector de tablas impresas de asistencia.\n" +
    `En la foto hay una tabla. La columna 0 (la primera, la que va numerada) es el Nº (un entero). Las columnas de marcas que debes leer son ${listaColumnas(columnas)} (contando desde 0). Cada Nº tiene una fila, y en esa fila hay una celda en cada una de esas columnas.\n` +
    "Las marcas posibles son exactamente: V (asistió), F (falta), FJ (falta justificada) o cadena vacía (si la celda está en blanco). Una cruz escrita a mano (una X) también es una falta: trátala como F.\n" +
    "Un hermano solo se da de baja de la lista si su NOMBRE COMPLETO está atravesado por una línea (el texto del nombre cruzado de lado a lado). En ese caso pon \"quitar\":true y todas las celdas de \"marca\" vacías. IMPORTANTE: una cruz pequeña o marquita AL LADO del nombre, un palito, un subrayado, un círculo en el Nº, o cualquier anotación en las celdas NO es un tachado: son marcas de falta y el hermano SIGUE en la lista; en esos casos no pongas \"quitar\".\n" +
    "En cada entrada incluye también \"nombre\" con el texto completo del nombre del hermano tal y como está escrito en su fila.\n" +
    `Devuelve ÚNICAMENTE un JSON válido, sin texto alrededor ni marcas de código. Cada entrada lleva "n", "nombre" y "marca": un array con las ${columnas.length} marcas en el MISMO ORDEN que las columnas pedidas. Ejemplo:\n` +
    `[{"n":1,"nombre":"Pérez García, Juan","marca":["V","F"]},{"n":3,"nombre":"Motos, Carlos","marca":["",""],"quitar":true}]` +
    "\nReglas: una entrada por fila (un Nº una vez); celda vacía → \"\"; si no estás seguro de una celda usa \"\"; el array \"marca\" debe tener exactamente tantas celdas como columnas pedidas; \"quitar\" es opcional: solo true si la fila está claramente tachada.\n"
  );
}

/** Prompt para cuotas (S/N): una columna por año de cuota, todas a la vez. */
function promptCuotas(columnas: number[]): string {
  return (
    "Eres un lector de listas de cuotas impresas.\n" +
    `En la foto hay una lista numerada. La columna 0 (la primera) es el Nº (un entero). Las columnas que debes leer son ${listaColumnas(columnas)} (contando desde 0), una por año de cuota.\n` +
    "Las marcas posibles son exactamente: S (pagada), N (pendiente) o cadena vacía (celda en blanco = NO ha pagado → trátala como N). Una P o una X escrita a mano también significa pagada: trátala como S.\n" +
    "Un hermano solo se da de baja de la lista si su NOMBRE COMPLETO está atravesado por una línea (el texto del nombre cruzado de lado a lado). En ese caso pon \"quitar\":true y todas las celdas de \"marca\" vacías. IMPORTANTE: una cruz pequeña o marquita AL LADO del nombre, un palito, un subrayado, un círculo en el Nº, o cualquier anotación en las celdas NO es un tachado: son marcas y el hermano SIGUE en la lista; en esos casos no pongas \"quitar\".\n" +
    "En cada entrada incluye también \"nombre\" con el texto completo del nombre del hermano tal y como está escrito en su fila.\n" +
    `Devuelve ÚNICAMENTE un JSON válido, sin texto alrededor ni marcas de código. Cada entrada lleva "n", "nombre" y "marca": un array con las ${columnas.length} marcas en el MISMO ORDEN que las columnas pedidas. Ejemplo:\n` +
    `[{"n":1,"nombre":"Pérez García, Juan","marca":["S","N"]},{"n":3,"nombre":"Motos, Carlos","marca":["",""],"quitar":true}]` +
    "\nReglas: una entrada por fila (un Nº una vez); el array \"marca\" debe tener exactamente tantas celdas como columnas pedidas; \"quitar\" es opcional: solo true si la fila está claramente tachada.\n"
  );
}

/** Convierte el JSON (con o sin marcas ```json``` alrededor) en filas válidas. */
function parsear(
  texto: string,
  marcasValidas: readonly string[],
  alias: Record<string, string> = {},
  nColumnas: number,
): FilaTranscrita[] {
  let t = texto.trim();
  // Gemini a veces envuelve la salida en una marca de bloque JSON o Markdown.
  const empieza = t.indexOf("[");
  const acaba = t.lastIndexOf("]");
  if (empieza >= 0 && acaba > empieza) {
    t = t.slice(empieza, acaba + 1);
  }
  let crudo: unknown;
  try {
    crudo = JSON.parse(t);
  } catch {
    return [];
  }
  if (!Array.isArray(crudo)) return [];

  const filas: FilaTranscrita[] = [];
  for (const item of crudo) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const n = Number(o.n);
    if (!Number.isInteger(n) || n <= 0) continue;
    const nombre = typeof o.nombre === "string" ? o.nombre.trim() : "";
    // El array de marcas debe ir en paralelo a las columnas pedidas. Si el
    // modelo envia menos, completamos con vacío; si más, lo recortamos.
    const crudas = Array.isArray(o.marca) ? o.marca : [];
    const marcas: Marca[] = [];
    const vacias: boolean[] = [];
    for (let k = 0; k < nColumnas; k++) {
      const celda = typeof crudas[k] === "string" ? crudas[k].trim().toUpperCase() : "";
      vacias.push(celda === "");
      // Lo que no sea marca válida se trata como vacío (a revisar en la UI),
      // salvo lo que el alias mapee: en asistencias X = falta (F); en cuotas
      // P o X = pagada (S) y vacío = no pagada (N).
      let marca: Marca | Cuota = marcasValidas.includes(celda)
        ? (celda as Marca | Cuota)
        : "";
      if (!marca) {
        const canon = alias[celda];
        if (canon && marcasValidas.includes(canon)) marca = canon as Marca | Cuota;
      }
      marcas.push(marca as Marca);
    }
    // Solo se da de baja a quien tiene TODAS las celdas en blanco en la hoja:
    // un tachado del nombre va sin marcas. Si el modelo marca "quitar" y a la
    // vez hay celdas escritas, es una marquita de falta, no una baja.
    const quitar =
      o.quitar === true && vacias.length > 0 && vacias.every((v) => v) ? true : undefined;
    filas.push({
      n,
      ...(nombre ? { nombre } : {}),
      marcas,
      ...(quitar ? { quitar } : {}),
    });
  }
  // Quita duplicados quedándonos con la última aparición: por nombre si lo hay,
  // si no por Nº.
  const porId = new Map<string | number, FilaTranscrita>();
  for (const f of filas) {
    porId.set(f.nombre || f.n, f);
  }
  return [...porId.values()];
}