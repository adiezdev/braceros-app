import { useMemo } from "react";

import { GraficoBarras } from "../components/GraficoBarras";
import { useTema } from "../hooks/useTema";
import { serieAsistencia } from "../lib/estadisticas";
import type { Estado } from "../types";

interface Props {
  est: Estado;
}

export function EstadisticasView({ est }: Props) {
  const { tema } = useTema();

  const serie = useMemo(
    () => serieAsistencia([...est.hermanos, ...est.archivados], est.aniosAsis),
    [est.hermanos, est.archivados, est.aniosAsis],
  );

  const barras = serie.map((p) => ({ anio: p.anio, exc: p.exc.pct, sm: p.sm.pct }));

  const media = (clave: "exc" | "sm"): number | null => {
    const conDatos = serie.filter((p) => p[clave].pct !== null);
    if (!conDatos.length) return null;
    const suma = conDatos.reduce((acc, p) => acc + (p[clave].pct ?? 0), 0);
    return Math.round(suma / conDatos.length);
  };
  const mediaExc = media("exc");
  const mediaSm = media("sm");

  const ultimo = serie.length ? serie[serie.length - 1] : null;

  return (
    <div className="vista-acciones estadisticas">
      <div className="vista-acciones__cabecera">
        <h2>Estadísticas de asistencia</h2>
        <p>
          Asistentes (V) sobre el total de la lista de cada año, contando el
          historial de los hermanos dados de baja.
        </p>
      </div>

      <div className="graf__resumen">
        <span className="graf__chip">
          Lista de <b>{ultimo?.anio ?? "—"}</b>: {ultimo ? ultimo.exc.total : 0} hermanos
        </span>
        <span className="graf__chip graf__chip--exc">
          Media Exaltación: <b>{mediaExc === null ? "—" : `${mediaExc}%`}</b>
        </span>
        <span className="graf__chip graf__chip--sm">
          Media San Martín: <b>{mediaSm === null ? "—" : `${mediaSm}%`}</b>
        </span>
      </div>

      <GraficoBarras datos={barras} tema={tema} />

      <div className="previa">
        <table className="rejilla rejilla--stats">
          <thead>
            <tr>
              <th>Año</th>
              <th className="th-exc">Exaltación</th>
              <th className="th-sm">San Martín</th>
            </tr>
          </thead>
          <tbody>
            {serie.map((p) => (
              <tr key={p.anio}>
                <td className="num">{p.anio}</td>
                <td className="th-exc">
                  {p.exc.pct === null ? "—" : (
                    <>
                      <b>{p.exc.v}</b> de {p.exc.total} · {p.exc.pct}%
                    </>
                  )}
                </td>
                <td className="th-sm">
                  {p.sm.pct === null ? "—" : (
                    <>
                      <b>{p.sm.v}</b> de {p.sm.total} · {p.sm.pct}%
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}