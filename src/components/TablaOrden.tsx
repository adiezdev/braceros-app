import { useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";

import { useAccionesBulk } from "../hooks/useAccionesBulk";
import { useEdicionNumero } from "../hooks/useEdicionNumero";
import { useReordenar } from "../hooks/useReordenar";
import { useSeleccion } from "../hooks/useSeleccion";
import { filtrarVisibles } from "../lib/filtrar";
import { cambiarCampoHermano, numerosPorBloque } from "../lib/modelo";
import type { Estado, Hermano } from "../types";
import { BulkBar } from "./BulkBar";
import { FilaHermano } from "./FilaHermano";

interface Props {
  est: Estado;
  setEst: Dispatch<SetStateAction<Estado>>;
  filtro: string;
}

/** La lista de hermanos: casillas, Nº editable, campos y acciones de fila. */
export function TablaOrden({ est, setEst, filtro }: Props) {
  const { seleccion, alternar, alternarTodas, todasMarcadas, limpiar } = useSeleccion();
  const bulk = useAccionesBulk(setEst, seleccion, limpiar);
  const { editandoId, borrador, setBorrador, rango, pista, abrir, confirmar, enEnter, enEscape } =
    useEdicionNumero(est, setEst);
  const { mover, insertarDebajo, borrar } = useReordenar(setEst);

  const visibles = useMemo(() => filtrarVisibles(est.hermanos, filtro), [est.hermanos, filtro]);
  const conRaya = !filtro.trim();
  const numeros = useMemo(() => numerosPorBloque(est.hermanos), [est.hermanos]);

  const idsVisibles = visibles.map((v) => v.hermano.id);
  const todasSeleccionadas = todasMarcadas(idsVisibles);

  const cambiarCampo = <C extends keyof Hermano>(id: string, campo: C, valor: Hermano[C]) =>
    setEst((p) => ({ ...p, hermanos: cambiarCampoHermano(p.hermanos, id, campo, valor) }));

  return (
    <>
      {seleccion.size > 0 && (
        <BulkBar
          cuantos={seleccion.size}
          onEliminar={() => bulk.eliminar()}
          onBajarFinal={() => bulk.aplicar(bulk.bajarAlFinal)}
          onBloque={(b) => bulk.aplicar(() => bulk.cambiarBloque(b))}
          onMarca={(m) => bulk.aplicar(() => bulk.ponerMarca(m))}
          onCuota={(c) => bulk.aplicar(() => bulk.ponerCuota(c))}
          onCerrar={limpiar}
        />
      )}

      <table className="rejilla rejilla--hermanos">
        <thead>
          <tr>
            <th className="th-check">
              <input
                type="checkbox"
                checked={todasSeleccionadas}
                onChange={() => alternarTodas(idsVisibles)}
                title={
                  todasSeleccionadas ? "Quitar la selección" : "Seleccionar los hermanos visibles"
                }
              />
            </th>
            <th className="th-num">Nº</th>
            <th>Nombre completo</th>
            <th className="th-bloque">Bloque</th>
            <th className="th-tel">Teléfono</th>
            <th className="th-obs">Observaciones</th>
            <th className="th-acc" aria-label="Acciones" title="Acciones" />
          </tr>
        </thead>
        <tbody>
          {visibles.map(({ hermano: h, indice: i }) => (
            <FilaHermano
              key={h.id}
              hermano={h}
              indice={i}
              numero={numeros[i]}
              totalHermanos={est.hermanos.length}
              conRaya={conRaya}
              seleccionado={seleccion.has(h.id)}
              onAlternar={alternar}
              edicion={{
                editandoNumero: editandoId === h.id,
                borrador,
                pista,
                rango,
                onSetBorrador: setBorrador,
                onConfirmarNumero: confirmar,
                onEnter: enEnter,
                onEscape: enEscape,
                onAbrirNumero: abrir,
              }}
              acciones={{
                onMover: mover,
                onInsertarDebajo: insertarDebajo,
                onBorrar: borrar,
                onCambiarCampo: cambiarCampo,
              }}
              cupo={est.cupo}
              mostrarRaya={conRaya}
              numeros={numeros}
            />
          ))}
        </tbody>
      </table>
    </>
  );
}
