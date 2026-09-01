import type { Bloque, ClaveProcesion, Cuota, Marca } from "./types";

export const ENTIDAD = "Agrupación de Braceros de San Martín";

export const BLOQUES: Bloque[] = ["HONORARIOS", "TITULARES", "SUPLENTES"];

export const PROCESIONES: { clave: ClaveProcesion; corto: string; largo: string }[] = [
  { clave: "exc", corto: "Exaltación", largo: "Exaltación de la Santa Cruz" },
  { clave: "sm", corto: "San Martín", largo: "San Martín" },
];

export const CICLO_CUOTA: Cuota[] = ["", "S", "N"];
export const CICLO_MARCA: Marca[] = ["", "V", "F", "FJ"];

/** Año al que corresponden las marcas transcritas de las hojas manuscritas. */
export const ANIO_BASE = 2025;

export const CUPO_POR_DEFECTO = 73;
export const CUOTA_POR_DEFECTO = 10;

export const ETIQUETA_BLOQUE: Record<Bloque, string> = {
  HONORARIOS: "Honorarios",
  TITULARES: "Titulares",
  SUPLENTES: "Suplentes",
};
