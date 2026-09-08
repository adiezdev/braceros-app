import { useMemo } from "react";

import { BLOQUES, ETIQUETA_BLOQUE } from "../constants";
import { contarBloque, nombresRepetidos } from "../lib/modelo";
import type { Estado } from "../types";
import { Aviso } from "./Aviso";

interface Props {
  est: Estado;
}

export function Resumen({ est }: Props) {
  const { hermanos } = est;

  const repetidos = useMemo(() => nombresRepetidos(hermanos), [hermanos]);

  return (
    <section className="resumen">
      <div className="resumen__cifra">
        <strong>{hermanos.length}</strong>
        <span>hermanos en la lista</span>
      </div>

      {repetidos.length > 0 && (
        <Aviso tono="error">
          {repetidos.length === 1
            ? `${repetidos[0]} aparece más de una vez.`
            : `Nombres repetidos: ${repetidos.join(", ")}.`}{" "}
          Hay que quitar uno de los puestos.
        </Aviso>
      )}

      <div className="resumen__bloques">
        {BLOQUES.map((b) => (
          <span key={b} className={`pastilla pastilla--${b.toLowerCase()}`}>
            {ETIQUETA_BLOQUE[b]}: {contarBloque(hermanos, b)}
          </span>
        ))}
      </div>
    </section>
  );
}
