import { BLOQUES, ENTIDAD, ETIQUETA_BLOQUE, PROCESIONES } from "../constants";
import escudo from "../data/escudosm.png";
import type { CfgImpresion, Estado, Hermano } from "../types";

interface Fila {
  h: Hermano | null;
  n: number;
}

interface Props {
  est: Estado;
  cfg: CfgImpresion;
  /** true = impresión, false = previsualización (listado continuo en pantalla) */
  paraImpresion?: boolean;
}

export function VistaImpresion({ est, cfg, paraImpresion = false }: Props) {
  const { hermanos, cuota } = est;
  const { tipo, anioAnterior, aniosNuevos, blancos } = cfg;

  const cabecera =
    tipo === "asistencias"
      ? [
          "Nº",
          "Nombre completo",
          `${PROCESIONES[0].corto} ${anioAnterior}`,
          `${PROCESIONES[1].corto} ${anioAnterior}`,
          ...aniosNuevos.flatMap((a) => [
            `${PROCESIONES[0].corto} ${a}`,
            `${PROCESIONES[1].corto} ${a}`,
          ]),
        ]
      : [
          "Nº",
          "Nombre completo",
          `Cuota ${anioAnterior}`,
          ...aniosNuevos.map((a) => `Cuota ${a}`),
        ];

  const valores = (h: Hermano): string[] =>
    tipo === "asistencias"
      ? [
          h.asis?.[anioAnterior]?.exc ?? "",
          h.asis?.[anioAnterior]?.sm ?? "",
          ...aniosNuevos.flatMap(() => ["", ""]),
        ]
      : [h.cuotas?.[anioAnterior] ?? "", ...aniosNuevos.map(() => "")];

  const textoAnios =
    aniosNuevos.length > 1
      ? `años ${aniosNuevos.join(", ")}`
      : `año ${aniosNuevos[0]}`;

  const ultimo = hermanos.length;

  const portada = (
    <section className="impresion__portada">
      <img className="impresion__escudo" src={escudo} alt="Escudo de la agrupación" />
      <h1 className="impresion__titulo">{ENTIDAD}</h1>
      <p className="impresion__sub">
        {tipo === "asistencias"
          ? `Asistencia a las procesiones · ${textoAnios}`
          : `Cuotas · ${textoAnios} · ${cuota} € anuales`}
      </p>
    </section>
  );

  /* Previsualización: listado continuo, cada bloque en su tabla. */
  if (!paraImpresion) {
    return (
      <div className="impresion impresion--previa">
        {portada}
        {BLOQUES.map((bloque) => {
          const filas = hermanos
            .map((h, i) => ({ h, n: i + 1 }))
            .filter(({ h }) => h.bloque === bloque);
          return (
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
                </tbody>
              </table>
            </section>
          );
        })}
      </div>
    );
  }

  /* Impresión: los bloques seguidos, sin forzar saltos. Cada bloque es su
     propia tabla y las tablas se parten por filas cuando la página se
     llena: la cabecera de la tabla se repite con `table-header-group` y
     ninguna fila se corta a mitad. Los bloques así van uno debajo del
     otro rellenando la hoja, sin huecos. */
  return (
    <div className="impresion impresion--print">
      {portada}
      {BLOQUES.map((bloque) => {
        const filas: Fila[] = hermanos
          .map((h, i) => ({ h, n: i + 1 }))
          .filter(({ h }) => h.bloque === bloque);
        const total = filas.length;
        if (bloque === "SUPLENTES") {
          for (let k = 0; k < blancos; k++) {
            filas.push({ h: null, n: ultimo + k + 1 });
          }
        }
        return (
          <section key={bloque} className="impresion__bloque">
            <h2>
              {ETIQUETA_BLOQUE[bloque]} <span>({total})</span>
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
                {filas.map(({ h, n }, k) => (
                  <tr key={k}>
                    <td className="num">{n}</td>
                    {h ? (
                      <>
                        <td>{h.nombre}</td>
                        {valores(h).map((v, j) => (
                          <td key={j} className="num">
                            {v}
                          </td>
                        ))}
                      </>
                    ) : (
                      cabecera.slice(1).map((c) => (
                        <td key={c}>&nbsp;</td>
                      ))
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}
    </div>
  );
}
