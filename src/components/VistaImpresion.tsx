import { BLOQUES, ENTIDAD, ETIQUETA_BLOQUE, PROCESIONES } from "../constants";
import escudo from "../data/escudosm.png";
import type { CfgImpresion, Estado, Hermano } from "../types";

/** Filas que entran en una hoja A4. Se afina mirando el preview de impresión. */
const FILAS_POR_HOJA = 42;

interface Fila {
  h: Hermano | null;
  n: number;
}

interface Hoja {
  bloque: (typeof BLOQUES)[number];
  esInicio: boolean;
  totalBloque: number;
  filas: Fila[];
}

interface Props {
  est: Estado;
  cfg: CfgImpresion;
}

export function VistaImpresion({ est, cfg }: Props) {
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

  const hojas: Hoja[] = [];
  BLOQUES.forEach((bloque) => {
    const filasBloque: Fila[] = hermanos
      .map((h, i) => ({ h, n: i + 1 }))
      .filter(({ h }) => h.bloque === bloque);
    if (bloque === "SUPLENTES") {
      for (let k = 0; k < blancos; k++) {
        filasBloque.push({ h: null, n: ultimo + k + 1 });
      }
    }
    for (let i = 0; i < filasBloque.length; i += FILAS_POR_HOJA) {
      hojas.push({
        bloque,
        esInicio: i === 0,
        totalBloque: filasBloque.filter((f) => f.h).length,
        filas: filasBloque.slice(i, i + FILAS_POR_HOJA),
      });
    }
  });

  const totalPaginas = hojas.length + 1; // la portada cuenta

  return (
    <div className="impresion">
      <section className="impresion__portada">
        <img
          className="impresion__escudo"
          src={escudo}
          alt="Escudo de la agrupación"
        />
        <h1 className="impresion__titulo">{ENTIDAD}</h1>
        <p className="impresion__sub">
          {tipo === "asistencias"
            ? `Asistencia a las procesiones · ${textoAnios}`
            : `Cuotas · ${textoAnios} · ${cuota} € anuales`}
        </p>
      </section>

      {hojas.map((hoja, i) => (
        <section key={`${hoja.bloque}-${i}`} className="impresion__hoja">
          {hoja.esInicio && (
            <h2>
              {ETIQUETA_BLOQUE[hoja.bloque]} <span>({hoja.totalBloque})</span>
            </h2>
          )}
          <table>
            <thead>
              <tr>
                {cabecera.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hoja.filas.map(({ h, n }, k) => (
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
          <p className="impresion__pag">
            Página {i + 2} de {totalPaginas}
          </p>
        </section>
      ))}
    </div>
  );
}