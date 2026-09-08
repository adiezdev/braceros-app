import React, { useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";

import { ETIQUETA_BLOQUE } from "../constants";
import { filtrarVisibles } from "../lib/filtrar";
import { numerosPorBloque, siguienteCuota } from "../lib/modelo";
import type { Estado, Hermano } from "../types";
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
  aniosCuotas: number[];
  cuota: number;
  onAlternar: (id: string, anio: number) => void;
  cupo: number;
  mostrarRaya: boolean;
  numeros: number[];
}

const FilaCuotaInner = ({
  hermano: h,
  indice: i,
  numero,
  aniosCuotas,
  cuota,
  onAlternar,
  cupo,
  mostrarRaya,
  numeros,
}: FilaProps) => {
  const pagadas = aniosCuotas.filter((a) => h.cuotas?.[a] === "S").length;
  return (
    <>
      <tr>
        <td className="num">{numero}</td>
        <td className="nombre">{h.nombre || <em>sin nombre</em>}</td>
        <td className={`bloque bloque--${h.bloque.toLowerCase()}`}>
          {ETIQUETA_BLOQUE[h.bloque]}
        </td>
        {aniosCuotas.map((a) => (
          <Celda
            key={a}
            tipo="cuota"
            valor={h.cuotas?.[a]}
            onClick={() => onAlternar(h.id, a)}
          />
        ))}
        <td className="cifra">{pagadas * cuota} €</td>
        <td className="cifra cifra--debe">
          {(aniosCuotas.length - pagadas) * cuota} €
        </td>
      </tr>
      {mostrarRaya && i + 1 === cupo && (
        <LineaCupo numero={numeros[cupo - 1] ?? 0} columnas={3 + aniosCuotas.length + 2} />
      )}
    </>
  );
};

const FilaCuota = React.memo(FilaCuotaInner, (prev, next) =>
  prev.hermano === next.hermano &&
  prev.numero === next.numero &&
  prev.indice === next.indice &&
  prev.cupo === next.cupo &&
  prev.mostrarRaya === next.mostrarRaya
);

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
        {visibles.map(({ hermano: h, indice: i }) => (
          <FilaCuota
            key={h.id}
            hermano={h}
            indice={i}
            numero={numeros[i]}
            aniosCuotas={aniosCuotas}
            cuota={cuota}
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
