import type { Dispatch, SetStateAction } from "react";

import { TablaAsistencias } from "../components/TablaAsistencias";
import type { Estado } from "../types";

interface Props {
  est: Estado;
  setEst: Dispatch<SetStateAction<Estado>>;
  filtro: string;
}

export function AsistenciasView({ est, setEst, filtro }: Props) {
  return <TablaAsistencias est={est} setEst={setEst} filtro={filtro} />;
}