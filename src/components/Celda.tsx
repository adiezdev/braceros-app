import type { Cuota, Marca } from "../types";

const CLASE_MARCA: Record<Marca, string> = {
  V: "m m--si",
  F: "m m--no",
  FJ: "m m--just",
  "": "m m--vacia",
};

const CLASE_CUOTA: Record<Cuota, string> = {
  S: "m m--si",
  N: "m m--no",
  "": "m m--vacia",
};

const TITULO = {
  marca: "Pulsa para cambiar: vacío, V asistió, F falta, FJ justificada",
  cuota: "Pulsa para cambiar: vacío, S pagada, N pendiente",
};

interface Props {
  valor: Marca | Cuota | undefined;
  tipo?: "marca" | "cuota";
  onClick: () => void;
}

export function Celda({ valor, tipo = "marca", onClick }: Props) {
  const v = valor ?? "";
  const clase =
    tipo === "cuota"
      ? CLASE_CUOTA[v as Cuota] ?? CLASE_CUOTA[""]
      : CLASE_MARCA[v as Marca] ?? CLASE_MARCA[""];
  return (
    <td className="td-marca">
      <button className={clase} onClick={onClick} title={TITULO[tipo]}>
        {v || "·"}
      </button>
    </td>
  );
}
