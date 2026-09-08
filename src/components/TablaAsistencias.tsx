import { Fragment, useMemo } from "react";

import { ETIQUETA_BLOQUE, PROCESIONES } from "../constants";
import { numerosPorBloque, siguienteMarca } from "../lib/modelo";
import type { ClaveProcesion, Estado, Marca } from "../types";
import { Celda } from "./Celda";
import { LineaCupo } from "./LineaCupo";

interface Props {
  est: Estado;
  setEst: React.Dispatch<React.SetStateAction<Estado>>;
  filtro: string;
}

export function TablaAsistencias({ est, setEst, filtro }: Props) {
  const { hermanos, aniosAsis, cupo } = est;

  const alternar = (id: string, anio: number, clave: ClaveProcesion) =>
    setEst((p) => ({
      ...p,
      hermanos: p.hermanos.map((h) => {
        if (h.id !== id) return h;
        const prev = h.asis?.[anio] ?? { exc: "" as Marca, sm: "" as Marca };
        return {
          ...h,
          asis: {
            ...h.asis,
            [anio]: { ...prev, [clave]: siguienteMarca(prev[clave]) },
          },
        };
      }),
    }));

  const visibles = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    return hermanos
      .map((h, i) => ({ h, i }))
      .filter(({ h }) => !q || h.nombre.toLowerCase().includes(q));
  }, [hermanos, filtro]);

  const columnas = 3 + aniosAsis.length * 2 + 1;
  const conRaya = !filtro.trim();
  const numeros = useMemo(() => numerosPorBloque(hermanos), [hermanos]);

  return (
    <table className="rejilla">
      <thead>
        <tr>
          <th className="th-num" rowSpan={2}>
            Nº
          </th>
          <th rowSpan={2}>Nombre completo</th>
          <th className="th-bloque" rowSpan={2}>
            Bloque
          </th>
          {aniosAsis.map((a) => (
            <th key={a} colSpan={2} className="th-anio">
              {a}
            </th>
          ))}
          <th className="th-marca" rowSpan={2}>
            Vino
          </th>
        </tr>
        <tr>
          {aniosAsis.flatMap((a) =>
            PROCESIONES.map((p) => (
              <th key={`${a}-${p.clave}`} className="th-marca">
                {p.corto}
              </th>
            ))
          )}
        </tr>
      </thead>
      <tbody>
        {visibles.map(({ h, i }) => {
          const marcas = aniosAsis
            .flatMap((a) => [h.asis?.[a]?.exc ?? "", h.asis?.[a]?.sm ?? ""])
            .filter(Boolean);
          const vino = marcas.filter((m) => m === "V").length;
          const pct = marcas.length
            ? Math.round((vino / marcas.length) * 100)
            : null;
          return (
            <Fragment key={h.id}>
              <tr>
                <td className="num">{numeros[i]}</td>
                <td className="nombre">{h.nombre || <em>sin nombre</em>}</td>
                <td className={`bloque bloque--${h.bloque.toLowerCase()}`}>
                  {ETIQUETA_BLOQUE[h.bloque]}
                </td>
                {aniosAsis.flatMap((a) =>
                  PROCESIONES.map((p) => (
                    <Celda
                      key={`${a}-${p.clave}`}
                      valor={h.asis?.[a]?.[p.clave]}
                      onClick={() => alternar(h.id, a, p.clave)}
                    />
                  ))
                )}
                <td className={`cifra ${pct !== null && pct < 50 ? "cifra--debe" : ""}`}>
                  {pct === null ? "—" : `${pct}%`}
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