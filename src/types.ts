export type Bloque = "HONORARIOS" | "TITULARES" | "SUPLENTES";

/** V asistió · F falta · FJ falta justificada · "" no se sabe */
export type Marca = "" | "V" | "F" | "FJ";

/** S pagada · N pendiente · "" sin anotar */
export type Cuota = "" | "S" | "N";

export type ClaveProcesion = "exc" | "sm";

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
}

export interface Estado {
  /** Puestos que procesionan: honorarios + titulares. */
  cupo: number;
  /** Cuota anual en euros. */
  cuota: number;
  aniosCuotas: number[];
  aniosAsis: number[];
  hermanos: Hermano[];
}

export type TipoListado = "asistencias" | "cuotas";

export interface CfgImpresion {
  tipo: TipoListado;
  anioAnterior: number;
  aniosNuevos: number[];
  blancos: number;
}

export type Pestana = "hermanos" | "cuotas" | "asistencias" | "imprimir";

export interface Aviso {
  tono: "ok" | "error" | "info";
  texto: string;
}
