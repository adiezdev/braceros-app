import type { Dispatch, SetStateAction } from "react";

import { TablaCuotas } from "../components/TablaCuotas";
import type { Estado } from "../types";

interface Props {
  est: Estado;
  setEst: Dispatch<SetStateAction<Estado>>;
  filtro: string;
}

export function CuotasView({ est, setEst, filtro }: Props) {
  return <TablaCuotas est={est} setEst={setEst} filtro={filtro} />;
}