import { useMemo } from "react";

import { BLOQUES, ETIQUETA_BLOQUE } from "../constants";
import { contarBloque, contarProcesionan, nombresRepetidos } from "../lib/modelo";
import type { Estado } from "../types";
import { Aviso } from "./Aviso";

interface Props {
  est: Estado;
}

export function Resumen({ est }: Props) {
  const { hermanos, aniosCuotas, aniosAsis, cupo, cuota } = est;

  const repetidos = useMemo(() => nombresRepetidos(hermanos), [hermanos]);
  const procesionan = contarProcesionan(hermanos);
  const anios = useMemo(
    () => [...new Set([...aniosCuotas, ...aniosAsis])].sort((a, b) => a - b),
    [aniosCuotas, aniosAsis]
  );

  const hayLista = hermanos.length > 0;

  return (
    <section className="resumen">
      <div className="resumen__cifra">
        <strong>{hermanos.length}</strong>
        <span>hermanos en la lista</span>
      </div>
      <div className="resumen__cifra">
        <strong>{procesionan}</strong>
        <span>procesionan, de {cupo}</span>
      </div>

      {hayLista && procesionan !== cupo && (
        <Aviso tono="error">
          Honorarios más titulares suman {procesionan} y el cupo son {cupo}.{" "}
          {procesionan < cupo
            ? `Faltan ${cupo - procesionan} por subir.`
            : `Sobran ${procesionan - cupo}, hay que bajar a alguien.`}
        </Aviso>
      )}

      {repetidos.length > 0 && (
        <Aviso tono="error">
          {repetidos.length === 1
            ? `${repetidos[0]} aparece más de una vez.`
            : `Nombres repetidos: ${repetidos.join(", ")}.`}{" "}
          Hay que quitar uno de los puestos.
        </Aviso>
      )}

      {anios.length > 0 && (
        <table className="tabla-mini">
          <thead>
            <tr>
              <th>Año</th>
              <th>Cuotas</th>
              <th>Recaudado</th>
              <th>Pendiente</th>
              <th>Exaltación</th>
              <th>San Martín</th>
            </tr>
          </thead>
          <tbody>
            {anios.map((a) => {
              const pag = hermanos.filter((h) => h.cuotas?.[a] === "S").length;
              return (
                <tr key={a}>
                  <td className="num">{a}</td>
                  <td>
                    {pag} de {hermanos.length}
                  </td>
                  <td>{pag * cuota} €</td>
                  <td className="cifra--debe">{(hermanos.length - pag) * cuota} €</td>
                  <td>{hermanos.filter((h) => h.asis?.[a]?.exc === "V").length}</td>
                  <td>{hermanos.filter((h) => h.asis?.[a]?.sm === "V").length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
