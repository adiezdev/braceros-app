import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";

import { confirmar } from "../lib/dialogo";
import { borrarArchivados } from "../lib/modelo";
import type { Estado } from "../types";

export function useBorrarPermanente(setEst: Dispatch<SetStateAction<Estado>>) {
  return useCallback(
    async (ids: string[], nombres: string[]) => {
      const cuanto = ids.length === 1 ? `a ${nombres[0] ?? ""}`.trim() : `${ids.length} hermanos`;
      const ok = await confirmar(
        `¿Borrar definitivamente ${cuanto}? Se pierden datos, marcas y cuotas; no se puede deshacer.`
      );
      if (!ok) return;
      setEst((p) => borrarArchivados(p, ids));
    },
    [setEst],
  );
}