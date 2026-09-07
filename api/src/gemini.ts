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
  marca: Marca;
}

export type TipoFoto = "asistencia" | "cuotas";

/**
 * Transcribe una foto. `imagenBase64` es el JPEG (o PNG) en base64 de una
 * sola página. `columna` es el índice (0-based) de la columna de marcas
 * (solo se usa en modo asistencia). `tipo` indica qué leer: asistencia
 * (V/F/FJ) o cuotas (S/N).
 */
export async function transcribir(
  imagenBase64: string,
  columna: number,
  tipo: TipoFoto = "asistencia"
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

  const prompt = tipo === "cuotas" ? promptCuotas : promptAsistencia(columna);

  const body = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: "image/jpeg",
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
  const filas = parsear(texto, marcasValidas);
  if (!filas.length) {
    throw new ErrorPeticion("Gemini no ha sabido leer la tabla de la foto. Repite la foto.", 422);
  }
  return filas;
}

/** Prompt para asistencia (V/F/FJ). */
function promptAsistencia(columna: number): string {
  if (!Number.isInteger(columna) || columna < 0 || columna > 30) {
    throw new ErrorPeticion("columna de marcas inválida");
  }
  return (
    "Eres un lector de tablas impresas de asistencia.\n" +
    `En la foto hay una tabla. La columna 0 (la primera, la que va numerada) es el Nº (un entero). La columna ${columna} (contando desde 0) es una marca escrita a mano. Cada Nº tiene una fila con su marca.\n` +
    "Las marcas posibles son exactamente: V (asistió), F (falta), FJ (falta justificada) o vacío (si la celda está en blanco).\n" +
    "Devuelve ÚNICAMENTE un JSON válido, sin texto alrededor ni marcas de código, con esta forma exacta:\n" +
    '[{"n":1,"marca":"V"},{"n":2,"marca":"F"}]' +
    "\nSolo puede haber una entrada por Nº. Si una celda está vacía, usa \"\". Si no estás seguro de una marca, usa \"\" (vacío) para esa fila.\n"
  );
}

/** Prompt para cuotas (S/N). */
const promptCuotas =
  "Eres un lector de listas de cuotas impresas.\n" +
  "En la foto hay una lista numerada. La columna 0 (la primera) es el Nº (un entero). La columna 1 (la siguiente) es una marca de estado de la cuota escrita a mano.\n" +
  "Las marcas posibles son exactamente: S (pagada), N (pendiente) o vacío (si la celda está en blanco).\n" +
  "Devuelve ÚNICAMENTE un JSON válido, sin texto alrededor ni marcas de código, con esta forma exacta:\n" +
  '[{"n":1,"marca":"S"},{"n":2,"marca":"N"}]' +
  "\nSolo puede haber una entrada por Nº. Si una celda está vacía, usa \"\". Si no estás seguro de una marca, usa \"\" (vacío) para esa fila.\n";

/** Convierte el JSON (con o sin marcas ```json``` alrededor) en filas válidas. */
function parsear(texto: string, marcasValidas: readonly string[]): FilaTranscrita[] {
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
    const m = String(o.marca ?? "").trim().toUpperCase();
    // Lo que no sea marca válida se trata como vacío (a revisar en la UI).
    const marca = marcasValidas.includes(m as Marca | Cuota) ? (m as Marca | Cuota) as Marca : "";
    filas.push({ n, marca });
  }
  // Quita duplicados de Nº quedándonos con la última aparición.
  const porN = new Map<number, FilaTranscrita>();
  for (const f of filas) porN.set(f.n, f);
  return [...porN.values()];
}