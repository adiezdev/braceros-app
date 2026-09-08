export type Bloque = "HONORARIOS" | "TITULARES" | "SUPLENTES";

/** V asistió · F falta · FJ falta justificada · "" no se sabe */
export type Marca = "" | "V" | "F" | "FJ";

/** S pagada · N pendiente · "" sin anotar */
export type Cuota = "" | "S" | "N";

export type ClaveProcesion = "exc" | "sm";

/**
 * Lo que el navegador le manda a la API. En vez de enviar la lista entera
 * cada vez que tocas una celda, se manda solo lo que cambió. Así dos personas
 * marcando cosas distintas a la vez no se pisan: cada una escribe sus filas.
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
  | { tipo: "reemplazar"; estado: Estado };

export interface RespuestaEstado {
  version: number;
  estado: Estado;
}

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

/** Una fila leída de la foto, ya alineada con su hermano. */
export interface FilaLeida {
  id: string;
  /** Puesto (1..N) en la lista, el que sale impreso. */
  n: number;
  nombre: string;
  marca: Marca | Cuota;
  /** 0..1; por debajo de ~0.6 conviene que el usuario la repare. */
  confianza: number;
  /** true si el hermano está tachado en la foto: hay que quitarlo de la lista. */
  quitar?: boolean;
}

export interface Estado {
  /** Puestos que procesionan: honorarios + titulares. */
  cupo: number;
  /** Cuota anual en euros. */
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

export type TipoListado = "asistencias" | "cuotas";

export interface CfgImpresion {
  tipo: TipoListado;
  anioAnterior: number;
  aniosNuevos: number[];
  blancos: number;
}

export type Pestana = "hermanos" | "cuotas" | "asistencias" | "archivados" | "imprimir";

export interface Aviso {
  tono: "ok" | "error" | "info";
  texto: string;
}
