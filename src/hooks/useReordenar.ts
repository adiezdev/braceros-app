import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";

import { corregirPorCupo, crearHermano } from "../lib/modelo";
import { confirmar } from "../lib/dialogo";
import type { Estado } from "../types";

/** Subir/bajar de puesto, insertar un hermano debajo y quitar de la lista. */
export function useReordenar(setEst: Dispatch<SetStateAction<Estado>>) {
  const mover = useCallback(
    (indice: number, delta: number) =>
      setEst((p) => {
        const j = indice + delta;
        if (j < 0 || j >= p.hermanos.length) return p;
        const lista = [...p.hermanos];
        [lista[indice], lista[j]] = [lista[j], lista[indice]];
        return { ...p, hermanos: corregirPorCupo(lista, [indice, j], p.cupo) };
      }),
    [setEst]
  );

  const insertarDebajo = useCallback(
    (indice: number) =>
      setEst((p) => {
        const lista = [...p.hermanos];
        lista.splice(
          indice + 1,
          0,
          crearHermano({ bloque: lista[indice]?.bloque ?? "SUPLENTES" }),
        );
        return { ...p, hermanos: corregirPorCupo(lista, [indice + 1], p.cupo) };
      }),
    [setEst]
  );

  const borrar = useCallback(
    async (id: string, nombre: string) => {
      const ok = await confirmar(`¿Quitar a ${nombre || "este hermano"} de la lista?`);
      if (!ok) return;
      setEst((p) => ({ ...p, hermanos: p.hermanos.filter((h) => h.id !== id) }));
    },
    [setEst]
  );

  return { mover, insertarDebajo, borrar };
}