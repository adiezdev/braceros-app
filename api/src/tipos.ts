/**
 * El mismo modelo que maneja la interfaz. Se repite aquí a propósito: la API
 * y el frontend son dos despliegues distintos y no deben compartir build.
 * Si cambia uno, tiene que cambiar el otro, y el compilador de cada lado avisa.
 */

export type Bloque = "HONORARIOS" | "TITULARES" | "SUPLENTES";
export type Marca = "" | "V" | "F" | "FJ";
export type Cuota = "" | "S" | "N";
export type ClaveProcesion = string;

export interface Asistencia {
  exc: Marca;
  sm: Marca;
}

export interface Hermano {
  id: string;
  nombre: string;
  bloque: Bloque;
  telefono: string;
  notas: string;
  cuotas: Record<number, Cuota>;
  asis: Record<number, Asistencia>;
}

export interface Estado {
  cupo: number;
  cuota: number;
  aniosCuotas: number[];
  aniosAsis: number[];
  hermanos: Hermano[];
  /** Hermanos dados de baja: conservan bloque y Nº del momento de archivar. */
  archivados: HermanoArchivado[];
}

/** Un hermano que se dio de baja. Congela bloque y Nº del momento del archivo. */
export interface HermanoArchivado {
  id: string;
  nombre: string;
  /** Bloque (titular/suplente/honorario) que tenía al archivar. */
  bloque: Bloque;
  telefono: string;
  notas: string;
  /** Nº que ocupaba en la lista al archivar. */
  numero: number;
  cuotas: Record<number, Cuota>;
  asis: Record<number, Asistencia>;
}

/**
 * Las operaciones son el contrato de escritura. En vez de mandar el estado
 * entero en cada tecla, el navegador manda solo lo que ha cambiado. Eso es lo
 * que permite que dos personas marquen cosas distintas a la vez sin pisarse:
 * cada una toca sus filas.
 */
export type Operacion =
  | { tipo: "ajustes"; cupo: number; cuota: number }
  | { tipo: "anio.alta"; cual: "cuotas" | "asistencias"; anio: number }
  | { tipo: "anio.baja"; cual: "cuotas" | "asistencias"; anio: number }
  | { tipo: "hermano.alta"; id: string; nombre: string; bloque: Bloque; telefono: string; notas: string }
  | { tipo: "hermano.baja"; id: string; numero?: number }
  | { tipo: "hermano.reactivar"; id: string }
  | { tipo: "hermano.borrar"; id: string }
  | { tipo: "hermano.campos"; id: string; nombre?: string; bloque?: Bloque; telefono?: string; notas?: string }
  | { tipo: "hermano.orden"; ids: string[] }
  | { tipo: "cuota"; hermanoId: string; anio: number; estado: Cuota }
  | { tipo: "asistencia"; hermanoId: string; anio: number; procesion: ClaveProcesion; marca: Marca }
  // Sustituir todo de golpe: cargar un Excel o restaurar la lista transcrita.
  | { tipo: "reemplazar"; estado: Estado };

export const BLOQUES: Bloque[] = ["HONORARIOS", "TITULARES", "SUPLENTES"];
export const MARCAS: Marca[] = ["", "V", "F", "FJ"];
export const CUOTAS: Cuota[] = ["", "S", "N"];