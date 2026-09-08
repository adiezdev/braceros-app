import type { Dispatch, SetStateAction } from "react";

import { TablaOrden } from "../components/TablaOrden";
import type { Estado } from "../types";

interface Props {
  est: Estado;
  setEst: Dispatch<SetStateAction<Estado>>;
  filtro: string;
}

export function HermanosView({ est, setEst, filtro }: Props) {
  return <TablaOrden est={est} setEst={setEst} filtro={filtro} />;
}