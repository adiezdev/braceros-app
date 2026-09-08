import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";

import { archivarHermano, corregirPorCupo, numerosPorBloque, reubicarEnBloque } from "../lib/modelo";
import { confirmar } from "../lib/dialogo";
import type { Bloque, Cuota, Estado, Marca } from "../types";

/**
 * Operaciones sobre el conjunto de hermanos seleccionados. Todas deben
 * terminar limpiando la selección; la barra usa `aplicar` para ello.
 */
export function useAccionesBulk(
  setEst: Dispatch<SetStateAction<Estado>>,
  seleccion: Set<string>,
  limpiar: () => void,
) {
  const eliminar = useCallback(async () => {
    const ids = [...seleccion];
    const ok = await confirmar(`¿Quitar ${ids.length} hermanos de la lista?`);
    if (!ok) return;
    setEst((p) => {
      const numeros = numerosPorBloque(p.hermanos);
      let estado = p;
      p.hermanos.forEach((h, i) => {
        if (ids.includes(h.id)) estado = archivarHermano(estado, h.id, numeros[i]);
      });
      return estado;
    });
    limpiar();
  }, [seleccion, setEst, limpiar]);

  const bajarAlFinal = useCallback(
    () =>
      setEst((p) => {
        const resto = p.hermanos.filter((h) => !seleccion.has(h.id));
        const bajados = p.hermanos.filter((h) => seleccion.has(h.id));
        const lista = [...resto, ...bajados];
        // Se valida la línea del cupo sobre todos los índices: los titulares
        // que caen por debajo pasan a suplentes y los que suben, a titulares.
        return { ...p, hermanos: corregirPorCupo(lista, lista.map((_, k) => k), p.cupo) };
      }),
    [seleccion, setEst]
  );

  const cambiarBloque = useCallback(
    (bloque: Bloque) =>
      setEst((p) => ({
        ...p,
        hermanos: [...seleccion].reduce((lista, id) => reubicarEnBloque(lista, id, bloque), p.hermanos),
      })),
    [seleccion, setEst]
  );

  const ponerMarca = useCallback(
    (marca: Marca) =>
      setEst((p) => ({
        ...p,
        hermanos: p.hermanos.map((h) => {
          if (!seleccion.has(h.id)) return h;
          const asis = { ...h.asis };
          for (const anio of p.aniosAsis) asis[anio] = { exc: marca, sm: marca };
          return { ...h, asis };
        }),
      })),
    [seleccion, setEst]
  );

  const ponerCuota = useCallback(
    (estado: Cuota) =>
      setEst((p) => ({
        ...p,
        hermanos: p.hermanos.map((h) => {
          if (!seleccion.has(h.id)) return h;
          const cuotas = { ...h.cuotas };
          for (const anio of p.aniosCuotas) cuotas[anio] = estado;
          return { ...h, cuotas };
        }),
      })),
    [seleccion, setEst]
  );

  /** Ejecuta una acción de la barra y quita la selección al terminar. */
  const aplicar = useCallback(
    (accion: () => void) => {
      accion();
      limpiar();
    },
    [limpiar]
  );

  return { eliminar, bajarAlFinal, cambiarBloque, ponerMarca, ponerCuota, aplicar };
}