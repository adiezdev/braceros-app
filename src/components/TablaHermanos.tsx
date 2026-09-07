import { ChevronDown, ChevronUp, CornerDownRight, Trash2 } from "lucide-react";
import { Fragment, useMemo } from "react";

import { BLOQUES, ETIQUETA_BLOQUE } from "../constants";
import { crearHermano, esBloque, numerosPorBloque } from "../lib/modelo";
import type { Estado, Hermano } from "../types";
import { LineaCupo } from "./LineaCupo";

interface Props {
  est: Estado;
  setEst: React.Dispatch<React.SetStateAction<Estado>>;
  filtro: string;
}

const COLUMNAS = 6;

export function TablaHermanos({ est, setEst, filtro }: Props) {
  const { hermanos, cupo } = est;

  const cambiar = <C extends keyof Hermano>(id: string, campo: C, valor: Hermano[C]) =>
    setEst((p) => ({
      ...p,
      hermanos: p.hermanos.map((h) => (h.id === id ? { ...h, [campo]: valor } : h)),
    }));

  const mover = (i: number, delta: number) =>
    setEst((p) => {
      const j = i + delta;
      if (j < 0 || j >= p.hermanos.length) return p;
      const l = [...p.hermanos];
      [l[i], l[j]] = [l[j], l[i]];
      return { ...p, hermanos: l };
    });

  const insertarDebajo = (i: number) =>
    setEst((p) => {
      const l = [...p.hermanos];
      l.splice(i + 1, 0, crearHermano({ bloque: l[i]?.bloque ?? "SUPLENTES" }));
      return { ...p, hermanos: l };
    });

  const borrar = (id: string, nombre: string) => {
    if (!window.confirm(`¿Quitar a ${nombre || "este hermano"} de la lista?`)) return;
    setEst((p) => ({ ...p, hermanos: p.hermanos.filter((h) => h.id !== id) }));
  };

  const visibles = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    return hermanos
      .map((h, i) => ({ h, i }))
      .filter(({ h }) => !q || h.nombre.toLowerCase().includes(q));
  }, [hermanos, filtro]);

  const conRaya = !filtro.trim();

  const numeros = useMemo(() => numerosPorBloque(hermanos), [hermanos]);

  return (
    <table className="rejilla">
      <thead>
        <tr>
          <th className="th-num">Nº</th>
          <th>Nombre completo</th>
          <th className="th-bloque">Bloque</th>
          <th className="th-tel">Teléfono</th>
          <th>Observaciones</th>
          <th className="th-acc">Orden</th>
        </tr>
      </thead>
      <tbody>
        {visibles.map(({ h, i }) => (
          <Fragment key={h.id}>
            <tr>
              <td className="num">{numeros[i]}</td>
              <td>
                <input
                  className="txt"
                  value={h.nombre}
                  placeholder="Nombre y apellidos"
                  onChange={(e) => cambiar(h.id, "nombre", e.target.value)}
                />
              </td>
              <td>
                <select
                  className={`sel sel--${h.bloque.toLowerCase()}`}
                  value={h.bloque}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (esBloque(v)) cambiar(h.id, "bloque", v);
                  }}
                >
                  {BLOQUES.map((b) => (
                    <option key={b} value={b}>
                      {ETIQUETA_BLOQUE[b]}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  className="txt txt--corto"
                  value={h.telefono}
                  onChange={(e) => cambiar(h.id, "telefono", e.target.value)}
                />
              </td>
              <td>
                <input
                  className="txt"
                  value={h.notas}
                  onChange={(e) => cambiar(h.id, "notas", e.target.value)}
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
                  disabled={!conRaya || i === hermanos.length - 1}
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
            {conRaya && i + 1 === cupo && (
              <LineaCupo numero={numeros[cupo - 1] ?? 0} columnas={COLUMNAS} />
            )}
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}
