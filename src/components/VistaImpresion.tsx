import { useMemo } from "react";

import { BLOQUES, ENTIDAD, ETIQUETA_BLOQUE, PROCESIONES } from "../constants";
import escudo from "../data/escudosm.png";
import { numerosPorBloque } from "../lib/modelo";
import type { CfgImpresion, Estado, Hermano } from "../types";

interface Fila {
  hermano: Hermano | null;
  numero: number;
}

interface Props {
  est: Estado;
  cfg: CfgImpresion;
  /** true = impresión, false = previsualización (listado continuo en pantalla) */
  paraImpresion?: boolean;
}

export function VistaImpresion({ est, cfg, paraImpresion = false }: Props) {
  const { hermanos } = est;
  const { tipo, anioAnterior, aniosNuevos, blancos, telefono, observaciones } = cfg;

  const numeros = useMemo(() => numerosPorBloque(hermanos), [hermanos]);

  const cabecera =
    tipo === "asistencias"
      ? [
          "Nº",
          "Nombre completo",
          ...(telefono ? ["Teléfono"] : []),
          ...(observaciones ? ["Observaciones"] : []),
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

  const valores = (hermano: Hermano): string[] =>
    tipo === "asistencias"
      ? [
          hermano.asis?.[anioAnterior]?.exc ?? "",
          hermano.asis?.[anioAnterior]?.sm ?? "",
          ...aniosNuevos.flatMap((a) => [
            hermano.asis?.[a]?.exc ?? "",
            hermano.asis?.[a]?.sm ?? "",
          ]),
        ]
      : [
          hermano.cuotas?.[anioAnterior] ?? "",
          ...aniosNuevos.map((a) => hermano.cuotas?.[a] ?? ""),
        ];

  /** Texto opcional del apartado hermanos, solo en asistencias. */
  const textoOpcional = (hermano: Hermano): string[] =>
    tipo !== "asistencias"
      ? []
      : [
          ...(telefono ? [hermano.telefono] : []),
          ...(observaciones ? [hermano.notas] : []),
        ];

  /** Color de la casilla según el estado: verde = sí/vino, rojo = no/falta,
      ámbar = falta justificada. */
  const claseCeldaImpresion = (v: string): string =>
    v === "S" || v === "V"
      ? "num imp--si"
      : v === "N" || v === "F"
        ? "num imp--no"
        : v === "FJ" || v === "J"
          ? "num imp--just"
          : "num";

  const esColumnaTexto = (c: string): boolean =>
    c === "Teléfono" || c === "Observaciones";

  const portada = (
    <section className="impresion__portada">
      <img className="impresion__escudo" src={escudo} alt="Escudo de la agrupación" />
      <h1 className="impresion__titulo">{ENTIDAD}</h1>
      <p className="impresion__sub">
        {tipo === "asistencias" ? `Asistencia a las procesiones` : `Cuotas anuales`}
      </p>
    </section>
  );

  const filasPorBloque = (bloque: (typeof BLOQUES)[number]): Fila[] =>
    hermanos
      .map((hermano, indice) => ({ hermano, numero: numeros[indice] }))
      .filter(({ hermano }) => hermano.bloque === bloque);

  const filasConBlancos = (bloque: (typeof BLOQUES)[number], conBlancos: boolean): Fila[] => {
    const filas = filasPorBloque(bloque);
    if (conBlancos && bloque === "SUPLENTES") {
      for (let k = 0; k < blancos; k++) {
        filas.push({ hermano: null, numero: numeros.length + k + 1 });
      }
    }
    return filas;
  };

  const renderBloque = (bloque: (typeof BLOQUES)[number], conBlancos: boolean) => {
    const total = filasPorBloque(bloque).length;
    const filas = filasConBlancos(bloque, conBlancos);
    return (
      <section key={bloque} className="impresion__bloque">
        <h2>
          {ETIQUETA_BLOQUE[bloque]} <span>({total})</span>
        </h2>
        <table>
          <thead>
            <tr>
              {cabecera.map((c) => (
                <th key={c} className={esColumnaTexto(c) ? "imp-txt" : undefined}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map(({ hermano, numero }, k) => (
              <tr key={hermano?.id ?? k}>
                <td className="num">{numero}</td>
                {hermano ? (
                  <>
                    <td>{hermano.nombre}</td>
                    {textoOpcional(hermano).map((v, j) => (
                      <td key={`txt-${j}`} className="imp-txt">
                        {v}
                      </td>
                    ))}
                    {valores(hermano).map((v, j) => (
                      <td key={j} className={claseCeldaImpresion(v)}>
                        {v}
                      </td>
                    ))}
                  </>
                ) : (
                  cabecera.slice(1).map((c) => <td key={c}>&nbsp;</td>)
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    );
  };

  /* Previsualización: listado continuo, cada bloque en su tabla. */
  if (!paraImpresion) {
    return (
      <div className="impresion impresion--previa">
        {portada}
        {BLOQUES.map((bloque) => renderBloque(bloque, false))}
      </div>
    );
  }

  /* Impresión: los bloques seguidos, sin forzar saltos; cada bloque es su
     propia tabla y se parte por filas al llenar la hoja, con la cabecera
     repetida. */
  return (
    <div className="impresion impresion--print">
      {portada}
      {BLOQUES.map((bloque) => renderBloque(bloque, true))}
    </div>
  );
}