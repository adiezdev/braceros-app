import type { Cuota, Marca } from "../types";

const CLASE_MARCA: Record<Marca, string> = {
  V: "m--si",
  F: "m--no",
  FJ: "m--just",
  "": "m--vacia",
};

const CLASE_CUOTA: Record<Cuota, string> = {
  S: "m--si",
  N: "m--no",
  "": "m--vacia",
};

/** Clase de color de una celda de marca (V/F/FJ) o cuota (S/N). */
export function claseCelda(valor: Marca | Cuota | undefined, tipo: "marca" | "cuota"): string {
  const v = valor ?? "";
  return tipo === "cuota" ? CLASE_CUOTA[v as Cuota] ?? "m--vacia" : CLASE_MARCA[v as Marca] ?? "m--vacia";
}

export const TITULO_CELDA = {
  marca: "Pulsa para cambiar: vacío, V asistió, F falta, FJ justificada",
  cuota: "Pulsa para cambiar: vacío, S pagada, N pendiente",
} as const;