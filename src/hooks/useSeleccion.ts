import { useCallback, useState } from "react";

export interface Seleccion {
  seleccion: Set<string>;
  alternar: (id: string) => void;
  /** Marca o desmarca todos los ids visibles (los de la lista filtrada). */
  alternarTodas: (visibles: string[]) => void;
  todasMarcadas: (visibles: string[]) => boolean;
  limpiar: () => void;
}

/** Registro de hermanos marcados con la columna de casillas. */
export function useSeleccion(): Seleccion {
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());

  const alternar = useCallback((id: string) => {
    setSeleccion((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });
  }, []);

  const todasMarcadas = useCallback(
    (visibles: string[]) => visibles.length > 0 && visibles.every((id) => seleccion.has(id)),
    [seleccion]
  );

  const alternarTodas = useCallback((visibles: string[]) => {
    setSeleccion((prev) => {
      const siguiente = new Set(prev);
      const marcadas = visibles.length > 0 && visibles.every((id) => prev.has(id));
      if (marcadas) visibles.forEach((id) => siguiente.delete(id));
      else visibles.forEach((id) => siguiente.add(id));
      return siguiente;
    });
  }, []);

  const limpiar = useCallback(() => setSeleccion(new Set()), []);

  return { seleccion, alternar, alternarTodas, todasMarcadas, limpiar };
}