import { ChevronDown, ChevronUp, CornerDownRight, Trash2 } from "lucide-react";
import { Fragment, useMemo, useRef, useState } from "react";

import { BLOQUES, ETIQUETA_BLOQUE } from "../constants";
import { crearHermano, esBloque, moverANumero, numerosPorBloque, reubicarEnBloque } from "../lib/modelo";
import type { Bloque, Estado, Hermano } from "../types";
import { LineaCupo } from "./LineaCupo";

interface Props {
  est: Estado;
  setEst: React.Dispatch<React.SetStateAction<Estado>>;
  filtro: string;
}

const COLUMNAS = 6;

export function TablaHermanos({ est, setEst, filtro }: Props) {
  const { hermanos, cupo } = est;

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [borradorNum, setBorradorNum] = useState("");
  const [rangoNum, setRangoNum] = useState<[number, number]>([1, 0]);
  const cancelarNum = useRef(false);

  const cambiar = <C extends keyof Hermano>(id: string, campo: C, valor: Hermano[C]) =>
    setEst((p) => ({
      ...p,
      hermanos:
        campo === "bloque"
          ? reubicarEnBloque(p.hermanos, id, valor as Bloque)
          : p.hermanos.map((h) => (h.id === id ? { ...h, [campo]: valor } : h)),
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

  const abrirEdicionNum = (i: number) => {
    const h = hermanos[i];
    const nHon = hermanos.filter((x) => x.bloque === "HONORARIOS").length;
    const nTit = hermanos.filter((x) => x.bloque === "TITULARES").length;
    let rango: [number, number];
    if (h.bloque === "HONORARIOS") rango = [1, nHon];
    else if (h.bloque === "TITULARES") rango = [1, nTit];
    else rango = [nTit + 1, hermanos.length];
    setEditandoId(h.id);
    setBorradorNum(String(numeros[i]));
    setRangoNum(rango);
  };

  const confirmarNum = (id: string) => {
    const n = Number(borradorNum);
    if (Number.isInteger(n) && n >= rangoNum[0] && n <= rangoNum[1]) {
      setEst((p) => ({ ...p, hermanos: moverANumero(p.hermanos, id, n) }));
      setEditandoId(null);
    } else {
      setEditandoId(null);
      setBorradorNum("");
    }
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
          <th className="th-acc">Orden <span className="input-ayuda">(pulsa el nº para reordenar)</span></th>
        </tr>
      </thead>
      <tbody>
        {visibles.map(({ h, i }) => (
          <Fragment key={h.id}>
            <tr>
              <td className="num">
                {editandoId === h.id ? (
                  <input
                    autoFocus
                    className="num-edit"
                    value={borradorNum}
                    title={`Entre ${rangoNum[0]} y ${rangoNum[1]}`}
                    onChange={(e) => setBorradorNum(e.target.value)}
                    onBlur={() => confirmarNum(h.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        cancelarNum.current = false;
                        (e.target as HTMLInputElement).blur();
                      } else if (e.key === "Escape") {
                        cancelarNum.current = true;
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                  />
                ) : (
                  <button
                    className="num-enlace"
                    onClick={() => abrirEdicionNum(i)}
                    disabled={!conRaya}
                    title={`Marcar como ${h.bloque.toLowerCase() === "suplentes" ? "suplente" : "puesto"} nº…`}
                  >
                    {numeros[i]}
                  </button>
                )}
              </td>
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
