import { Fragment, useMemo } from "react";

import { ETIQUETA_BLOQUE } from "../constants";
import { filtrarVisibles } from "../lib/filtrar";
import { numerosPorBloque, siguienteCuota } from "../lib/modelo";
import type { Estado } from "../types";
import { Celda } from "./Celda";
import { LineaCupo } from "./LineaCupo";

interface Props {
  est: Estado;
  setEst: React.Dispatch<React.SetStateAction<Estado>>;
  filtro: string;
}

export function TablaCuotas({ est, setEst, filtro }: Props) {
  const { hermanos, aniosCuotas, cupo, cuota } = est;

  const alternar = (id: string, anio: number) =>
    setEst((p) => ({
      ...p,
      hermanos: p.hermanos.map((h) =>
        h.id === id
          ? { ...h, cuotas: { ...h.cuotas, [anio]: siguienteCuota(h.cuotas?.[anio]) } }
          : h
      ),
    }));

  const visibles = useMemo(() => filtrarVisibles(hermanos, filtro), [hermanos, filtro]);

  const columnas = 3 + aniosCuotas.length + 2;
  const conRaya = !filtro.trim();
  const numeros = useMemo(() => numerosPorBloque(hermanos), [hermanos]);

  return (
    <table className="rejilla">
      <thead>
        <tr>
          <th className="th-num">Nº</th>
          <th>Nombre completo</th>
          <th className="th-bloque">Bloque</th>
          {aniosCuotas.map((a) => (
            <th key={a} className="th-anio">
              {a}
            </th>
          ))}
          <th className="th-marca">Pagado</th>
          <th className="th-marca">Debe</th>
        </tr>
      </thead>
      <tbody>
        {visibles.map(({ hermano: h, indice: i }) => {
          const pagadas = aniosCuotas.filter((a) => h.cuotas?.[a] === "S").length;
          return (
            <Fragment key={h.id}>
              <tr>
                <td className="num">{numeros[i]}</td>
                <td className="nombre">{h.nombre || <em>sin nombre</em>}</td>
                <td className={`bloque bloque--${h.bloque.toLowerCase()}`}>
                  {ETIQUETA_BLOQUE[h.bloque]}
                </td>
                {aniosCuotas.map((a) => (
                  <Celda
                    key={a}
                    tipo="cuota"
                    valor={h.cuotas?.[a]}
                    onClick={() => alternar(h.id, a)}
                  />
                ))}
                <td className="cifra">{pagadas * cuota} €</td>
                <td className="cifra cifra--debe">
                  {(aniosCuotas.length - pagadas) * cuota} €
                </td>
              </tr>
              {conRaya && i + 1 === cupo && (
                <LineaCupo numero={numeros[cupo - 1] ?? 0} columnas={columnas} />
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}