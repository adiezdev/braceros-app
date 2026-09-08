import type { Dispatch, SetStateAction } from "react";

import { PanelImpresion } from "../components/PanelImpresion";
import type { CfgImpresion, Estado } from "../types";

interface Props {
  est: Estado;
  cfg: CfgImpresion;
  setCfg: Dispatch<SetStateAction<CfgImpresion>>;
}

export function ImprimirView({ est, cfg, setCfg }: Props) {
  return <PanelImpresion est={est} cfg={cfg} setCfg={setCfg} />;
}