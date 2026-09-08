import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";

import { confirmar } from "../lib/dialogo";
import { reactivarHermano } from "../lib/modelo";
import type { Estado } from "../types";

export function useReactivar(setEst: Dispatch<SetStateAction<Estado>>) {
  return useCallback(
    async (id: string, nombre: string) => {
      const ok = await confirmar(
        `¿Reactivar a ${nombre || "este hermano"}? Vuelve a la lista activa.`
      );
      if (!ok) return;
      setEst((p) => reactivarHermano(p, id));
    },
    [setEst],
  );
}
