import { ChevronDown, ChevronUp, CornerDownRight, Trash2 } from "lucide-react";
import { Fragment, useMemo } from "react";

import { BLOQUES, ETIQUETA_BLOQUE } from "../constants";
import { useAccionesBulk } from "../hooks/useAccionesBulk";
import { useEdicionNumero } from "../hooks/useEdicionNumero";
import { useReordenar } from "../hooks/useReordenar";
import { useSeleccion } from "../hooks/useSeleccion";
import { filtrarVisibles } from "../lib/filtrar";
import { esBloque, numerosPorBloque, reubicarEnBloque } from "../lib/modelo";
import type { Bloque, Estado, Hermano } from "../types";
import { BulkBar } from "./BulkBar";
import { LineaCupo } from "./LineaCupo";
import { Input } from "./ui/Input";
import { Select } from "./ui/Select";

interface Props {
  est: Estado;
  setEst: React.Dispatch<React.SetStateAction<Estado>>;
  filtro: string;
}

const COLUMNAS = 7;

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
    setEst((p) => ({
      ...p,
      hermanos:
        campo === "bloque"
          ? reubicarEnBloque(p.hermanos, id, valor as Bloque)
          : p.hermanos.map((h) => (h.id === id ? { ...h, [campo]: valor } : h)),
    }));

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

      <table className="rejilla">
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
            <th>Observaciones</th>
            <th className="th-acc">
              Orden <span className="input-ayuda">(pulsa el nº para reordenar)</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {visibles.map(({ hermano: h, indice: i }) => (
            <Fragment key={h.id}>
              <tr>
                <td className="td-check">
                  <input
                    type="checkbox"
                    checked={seleccion.has(h.id)}
                    onChange={() => alternar(h.id)}
                    title="Seleccionar este hermano"
                  />
                </td>
                <td className="num">
                  {editandoId === h.id ? (
                    <input
                      autoFocus
                      className="num-edit"
                      value={borrador}
                      title={pista || `Entre ${rango[0]} y ${rango[1]}`}
                      onChange={(e) => setBorrador(e.target.value)}
                      onBlur={() => confirmar(h.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          enEnter();
                          (e.target as HTMLInputElement).blur();
                        } else if (e.key === "Escape") {
                          enEscape();
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                    />
                  ) : (
                    <button
                      className="num-enlace"
                      onClick={() => abrir(i)}
                      disabled={!conRaya}
                      title={`Marcar como ${h.bloque.toLowerCase() === "suplentes" ? "suplente" : "puesto"} nº…`}
                    >
                      {numeros[i]}
                    </button>
                  )}
                </td>
                <td>
                  <Input
                    value={h.nombre}
                    placeholder="Nombre y apellidos"
                    onChange={(e) => cambiarCampo(h.id, "nombre", e.target.value)}
                  />
                </td>
                <td>
                  <Select
                    className={`sel--${h.bloque.toLowerCase()}`}
                    value={h.bloque}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (esBloque(v)) cambiarCampo(h.id, "bloque", v);
                    }}
                  >
                    {BLOQUES.map((b) => (
                      <option key={b} value={b}>
                        {ETIQUETA_BLOQUE[b]}
                      </option>
                    ))}
                  </Select>
                </td>
                <td>
                  <Input
                    className="txt--corto"
                    value={h.telefono}
                    onChange={(e) => cambiarCampo(h.id, "telefono", e.target.value)}
                  />
                </td>
                <td>
                  <Input
                    value={h.notas}
                    onChange={(e) => cambiarCampo(h.id, "notas", e.target.value)}
                  />
                </td>
                <td className="acc">
                  <button
                    onClick={() => mover(i, -1)}
                    disabled={!conRaya || i === 0}
                    title="Subir un puesto"
                  >
                    <ChevronUp size={15} />
                  </button>
                  <button
                    onClick={() => mover(i, 1)}
                    disabled={!conRaya || i === est.hermanos.length - 1}
                    title="Bajar un puesto"
                  >
                    <ChevronDown size={15} />
                  </button>
                  <button
                    onClick={() => insertarDebajo(i)}
                    disabled={!conRaya}
                    title="Insertar un hermano debajo"
                  >
                    <CornerDownRight size={15} />
                  </button>
                  <button
                    className="acc--peligro"
                    onClick={() => borrar(h.id, h.nombre)}
                    title="Quitar de la lista"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
              {conRaya && i + 1 === est.cupo && (
                <LineaCupo numero={numeros[est.cupo - 1] ?? 0} columnas={COLUMNAS} />
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </>
  );
}