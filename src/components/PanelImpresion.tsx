import { Plus, Printer, X } from "lucide-react";
import { createPortal } from "react-dom";

import type { CfgImpresion, Estado, TipoListado } from "../types";
import { VistaImpresion } from "./VistaImpresion";

interface Props {
  est: Estado;
  cfg: CfgImpresion;
  setCfg: React.Dispatch<React.SetStateAction<CfgImpresion>>;
}

export function PanelImpresion({ est, cfg, setCfg }: Props) {
  /**
   * Se imprime la propia página: la CSS de @media print deja fuera la
   * interfaz (.app a display:none) y deja visible solo este bloque, que
   * está portalizado fuera de .app para que ese display:none no lo recoja.
   * Imprimir la página directamente es lo que soportan todos los navegadores
   * de forma fiable; el iframe de react-to-print salía en blanco (sobre todo
   * en Safari) porque los enlaces relativos no se resuelven dentro del iframe.
   */
  const imprimir = () => {
    const tituloAnterior = document.title;
    document.title = "listado-braceros";
    window.addEventListener(
      "afterprint",
      () => {
        document.title = tituloAnterior;
      },
      { once: true }
    );
    window.print();
    // En Safari window.print no bloquea: es afterprint quien restaura.
    // En otros navegadores, con el diálogo cerrado ya se ha restaurado ahí.
  };

  const anadirAnioNuevo = () =>
    setCfg((c) => ({
      ...c,
      aniosNuevos: [
        ...c.aniosNuevos,
        (c.aniosNuevos.length ? Math.max(...c.aniosNuevos) : c.anioAnterior) + 1,
      ],
    }));

  const cambiarAnioNuevo = (i: number, valor: number) =>
    setCfg((c) => ({
      ...c,
      aniosNuevos: c.aniosNuevos.map((a, j) => (j === i ? valor : a)),
    }));

  const quitarAnioNuevo = (i: number) =>
    setCfg((c) => ({
      ...c,
      aniosNuevos: c.aniosNuevos.filter((_, j) => j !== i),
    }));

  return (
    <>
      <div className="panel-impr">
        <div className="panel-impr__cfg">
          <label>
            Qué listado
            <select
              value={cfg.tipo}
              onChange={(e) =>
                setCfg((c) => ({ ...c, tipo: e.target.value as TipoListado }))
              }
            >
              <option value="asistencias">Asistencias</option>
              <option value="cuotas">Cuotas</option>
            </select>
          </label>

          <label>
            Año que se muestra
            <input
              type="number"
              value={cfg.anioAnterior}
              onChange={(e) =>
                setCfg((c) => ({ ...c, anioAnterior: Number(e.target.value) }))
              }
            />
          </label>

          <label>
            Años en blanco
            <span className="anios-blancos">
              {cfg.aniosNuevos.map((a, i) => (
                <span key={i} className="anios-blancos__fila">
                  <input
                    type="number"
                    value={a}
                    onChange={(e) => cambiarAnioNuevo(i, Number(e.target.value))}
                  />
                  <button
                    type="button"
                    className="anios-blancos__x"
                    onClick={() => quitarAnioNuevo(i)}
                    title="Quitar este año"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
              <button type="button" className="btn btn--fino" onClick={anadirAnioNuevo}>
                <Plus size={13} /> Añadir
              </button>
            </span>
          </label>

          <label>
            Filas vacías al final
            <input
              type="number"
              min={0}
              max={60}
              value={cfg.blancos}
              onChange={(e) =>
                setCfg((c) => ({
                  ...c,
                  blancos: Math.max(0, Math.min(60, Number(e.target.value))),
                }))
              }
            />
          </label>

          <button className="btn btn--fuerte" onClick={imprimir}>
            <Printer size={15} /> Imprimir o guardar en PDF
          </button>
        </div>

        <p className="panel-impr__nota">
          Imprime la portada con el escudo, centrada, y después el listado con
          los bloques seguidos sin huecos: honorarios, titulares y suplentes
          van uno debajo del otro rellenando cada hoja. La cabecera de la tabla
          se repite al pasar de página y ninguna fila se corta a mitad. El
          documento queda oculto hasta que pulsas imprimir.
        </p>

        <div className="previa">
          <VistaImpresion est={est} cfg={cfg} />
        </div>
      </div>

      {/* Fuera de .app a propósito: al imprimir se oculta .app y solo queda
          esto visible. Portalizado al cuerpo para que el display:none de la
          interfaz no lo arrastre consigo. */}
      {createPortal(
        <div className="solo-impresion">
          <VistaImpresion est={est} cfg={cfg} paraImpresion />
        </div>,
        document.body
      )}
    </>
  );
}
