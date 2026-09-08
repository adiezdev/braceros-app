import type { Cuota, Marca } from "../types";
import { claseCelda, TITULO_CELDA } from "../lib/marcas";

interface Props {
  valor: Marca | Cuota | undefined;
  tipo?: "marca" | "cuota";
  onClick: () => void;
}

export function Celda({ valor, tipo = "marca", onClick }: Props) {
  const v = valor ?? "";
  return (
    <td className="td-marca">
      <button className={`m ${claseCelda(v, tipo)}`} onClick={onClick} title={TITULO_CELDA[tipo]}>
        {v || "·"}
      </button>
    </td>
  );
}