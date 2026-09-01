import { BLOQUES, ENTIDAD, ETIQUETA_BLOQUE, PROCESIONES } from "../constants";
import type { CfgImpresion, Estado, Hermano } from "../types";

interface Props {
  est: Estado;
  cfg: CfgImpresion;
}

export function VistaImpresion({ est, cfg }: Props) {
  const { hermanos, cuota } = est;
  const { tipo, anioAnterior, anioNuevo, blancos } = cfg;

  const grupos = BLOQUES.map((b) => ({
    bloque: b,
    filas: hermanos
      .map((h, i) => ({ h, n: i + 1 }))
      .filter(({ h }) => h.bloque === b),
  }));

  const cabecera =
    tipo === "asistencias"
      ? [
          "Nº",
          "Nombre completo",
          `${PROCESIONES[0].corto} ${anioAnterior}`,
          `${PROCESIONES[1].corto} ${anioAnterior}`,
          `${PROCESIONES[0].corto} ${anioNuevo}`,
          `${PROCESIONES[1].corto} ${anioNuevo}`,
        ]
      : ["Nº", "Nombre completo", `Cuota ${anioAnterior}`, `Cuota ${anioNuevo}`];

  const valores = (h: Hermano): string[] =>
    tipo === "asistencias"
      ? [h.asis?.[anioAnterior]?.exc ?? "", h.asis?.[anioAnterior]?.sm ?? "", "", ""]
      : [h.cuotas?.[anioAnterior] ?? "", ""];

  const ultimo = hermanos.length;

  return (
    <div className="impresion">
      <h1 className="impresion__titulo">{ENTIDAD}</h1>
      <p className="impresion__sub">
        {tipo === "asistencias"
          ? `Asistencia a las procesiones · año ${anioNuevo}`
          : `Cuotas · año ${anioNuevo} · ${cuota} € anuales`}
      </p>

      {grupos.map(({ bloque, filas }) => (
        <section key={bloque} className="impresion__bloque">
          <h2>
            {ETIQUETA_BLOQUE[bloque]} <span>({filas.length})</span>
          </h2>
          <table>
            <thead>
              <tr>
                {cabecera.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.map(({ h, n }) => (
                <tr key={h.id}>
                  <td className="num">{n}</td>
                  <td>{h.nombre}</td>
                  {valores(h).map((v, k) => (
                    <td key={k} className="num">
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
              {bloque === "SUPLENTES" &&
                Array.from({ length: blancos }, (_, k) => (
                  <tr key={`blanco-${k}`}>
                    <td className="num">{ultimo + k + 1}</td>
                    {cabecera.slice(1).map((c) => (
                      <td key={c}>&nbsp;</td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
