import React, { useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";

import { ETIQUETA_BLOQUE, PROCESIONES } from "../constants";
import { filtrarVisibles } from "../lib/filtrar";
import { alternarAsistencia, numerosPorBloque } from "../lib/modelo";
import type { ClaveProcesion, Estado, Hermano } from "../types";
import { Celda } from "./Celda";
import { LineaCupo } from "./LineaCupo";

interface Props {
  est: Estado;
  setEst: Dispatch<SetStateAction<Estado>>;
  filtro: string;
}

interface FilaProps {
  hermano: Hermano;
  indice: number;
  numero: number;
  aniosAsis: number[];
  onAlternar: (id: string, anio: number, clave: ClaveProcesion) => void;
  cupo: number;
  mostrarRaya: boolean;
  numeros: number[];
}

const FilaAsistenciaInner = ({
  hermano: h,
  indice: i,
  numero,
  aniosAsis,
  onAlternar,
  cupo,
  mostrarRaya,
  numeros,
}: FilaProps) => {
  const marcas = aniosAsis
    .flatMap((a) => [h.asis?.[a]?.exc ?? "", h.asis?.[a]?.sm ?? ""])
    .filter(Boolean);
  const vino = marcas.filter((m) => m === "V").length;
  const pct = marcas.length ? Math.round((vino / marcas.length) * 100) : null;
  return (
    <>
      <tr>
        <td className="num">{numero}</td>
        <td className="nombre">{h.nombre || <em>sin nombre</em>}</td>
        <td className={`bloque bloque--${h.bloque.toLowerCase()}`}>
          {ETIQUETA_BLOQUE[h.bloque]}
        </td>
        {aniosAsis.flatMap((a) =>
          PROCESIONES.map((p) => (
            <Celda
              key={`${a}-${p.clave}`}
              valor={h.asis?.[a]?.[p.clave]}
              onClick={() => onAlternar(h.id, a, p.clave)}
            />
          ))
        )}
        <td className={`cifra ${pct !== null && pct < 50 ? "cifra--debe" : ""}`}>
          {pct === null ? "—" : `${pct}%`}
        </td>
      </tr>
      {mostrarRaya && i + 1 === cupo && (
        <LineaCupo numero={numeros[cupo - 1] ?? 0} columnas={3 + aniosAsis.length * 2 + 1} />
      )}
    </>
  );
};

const FilaAsistencia = React.memo(FilaAsistenciaInner, (prev, next) =>
  prev.hermano === next.hermano &&
  prev.numero === next.numero &&
  prev.indice === next.indice &&
  prev.aniosAsis === next.aniosAsis &&
  prev.cupo === next.cupo &&
  prev.mostrarRaya === next.mostrarRaya
);

export function TablaAsistencias({ est, setEst, filtro }: Props) {
  const { hermanos, aniosAsis, cupo } = est;

  const alternar = (id: string, anio: number, clave: ClaveProcesion) =>
    setEst((p) => ({ ...p, hermanos: alternarAsistencia(p.hermanos, id, anio, clave) }));

  const visibles = useMemo(() => filtrarVisibles(hermanos, filtro), [hermanos, filtro]);

  const conRaya = !filtro.trim();
  const numeros = useMemo(() => numerosPorBloque(hermanos), [hermanos]);

  return (
    <table className="rejilla rejilla--asistencias">
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
        {visibles.map(({ hermano: h, indice: i }) => (
          <FilaAsistencia
            key={h.id}
            hermano={h}
            indice={i}
            numero={numeros[i]}
            aniosAsis={aniosAsis}
            onAlternar={alternar}
            cupo={cupo}
            mostrarRaya={conRaya}
            numeros={numeros}
          />
        ))}
      </tbody>
    </table>
  );
}
