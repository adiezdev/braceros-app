import { ChevronDown, ChevronUp, CornerDownRight, Trash2, X } from "lucide-react";
import { Fragment, useMemo, useRef, useState } from "react";

import { BLOQUES, ETIQUETA_BLOQUE } from "../constants";
import {
  crearHermano,
  corregirPorCupo,
  esBloque,
  moverANumero,
  numerosPorBloque,
  reubicarEnBloque,
} from "../lib/modelo";
import type { Bloque, Cuota, Estado, Hermano, Marca } from "../types";
import { LineaCupo } from "./LineaCupo";

interface Props {
  est: Estado;
  setEst: React.Dispatch<React.SetStateAction<Estado>>;
  filtro: string;
}

const COLUMNAS = 7;

export function TablaHermanos({ est, setEst, filtro }: Props) {
  const { hermanos, cupo } = est;

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [borradorNum, setBorradorNum] = useState("");
  const [rangoNum, setRangoNum] = useState<[number, number]>([1, 0]);
  const [pistaNum, setPistaNum] = useState("");
  const cancelarNum = useRef(false);

  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());

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
      return { ...p, hermanos: corregirPorCupo(l, [i, j], p.cupo) };
    });

  const insertarDebajo = (i: number) =>
    setEst((p) => {
      const l = [...p.hermanos];
      l.splice(i + 1, 0, crearHermano({ bloque: l[i]?.bloque ?? "SUPLENTES" }));
      return { ...p, hermanos: corregirPorCupo(l, [i + 1], p.cupo) };
    });

  const borrar = (id: string, nombre: string) => {
    if (!window.confirm(`¿Quitar a ${nombre || "este hermano"} de la lista?`)) return;
    setEst((p) => ({ ...p, hermanos: p.hermanos.filter((h) => h.id !== id) }));
  };

  const abrirEdicionNum = (i: number) => {
    const h = hermanos[i];
    const nHon = hermanos.filter((x) => x.bloque === "HONORARIOS").length;
    const nTotal = hermanos.length - nHon;
    const rango: [number, number] = h.bloque === "HONORARIOS" ? [1, nHon] : [1, nTotal];
    const linea = cupo - nHon;
    setEditandoId(h.id);
    setBorradorNum(String(numeros[i]));
    setRangoNum(rango);
    setPistaNum(
      h.bloque === "HONORARIOS"
        ? `Nº de honorario: entre 1 y ${nHon}`
        : `Puesto 1..${nTotal}: hasta ${linea} titular, de ${linea + 1} en adelante suplente`,
    );
  };

  const confirmarNum = (id: string) => {
    if (cancelarNum.current) {
      cancelarNum.current = false;
      setEditandoId(null);
      setBorradorNum("");
      return;
    }
    const n = Number(borradorNum);
    if (Number.isInteger(n) && n >= rangoNum[0] && n <= rangoNum[1]) {
      setEst((p) => ({ ...p, hermanos: moverANumero(p.hermanos, id, n, p.cupo) }));
    }
    setEditandoId(null);
    setBorradorNum("");
  };

  const visibles = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    return hermanos
      .map((h, i) => ({ h, i }))
      .filter(({ h }) => !q || h.nombre.toLowerCase().includes(q));
  }, [hermanos, filtro]);

  const conRaya = !filtro.trim();

  const numeros = useMemo(() => numerosPorBloque(hermanos), [hermanos]);

  /* selección múltiple */

  const alternarFila = (id: string) =>
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const idsVisibles = visibles.map(({ h }) => h.id);
  const todasMarcadas = idsVisibles.length > 0 && idsVisibles.every((id) => seleccion.has(id));

  const alternarTodas = () =>
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (todasMarcadas) idsVisibles.forEach((id) => next.delete(id));
      else idsVisibles.forEach((id) => next.add(id));
      return next;
    });

  const limpiarSeleccion = () => setSeleccion(new Set());

  const eliminarSeleccion = () => {
    const sel = [...seleccion];
    if (!window.confirm(`¿Quitar ${sel.length} hermanos de la lista?`)) return;
    setEst((p) => ({ ...p, hermanos: p.hermanos.filter((h) => !sel.includes(h.id)) }));
    limpiarSeleccion();
  };

  const bajarSeleccion = () =>
    setEst((p) => {
      const resto = p.hermanos.filter((h) => !seleccion.has(h.id));
      const bajados = p.hermanos.filter((h) => seleccion.has(h.id));
      const l = [...resto, ...bajados];
      return { ...p, hermanos: corregirPorCupo(l, l.map((_, k) => k), p.cupo) };
    });

  const cambiarBloqueSeleccion = (bloque: Bloque) =>
    setEst((p) => ({
      ...p,
      hermanos: [...seleccion].reduce((l, id) => reubicarEnBloque(l, id, bloque), p.hermanos),
    }));

  const ponerMarcaSeleccion = (m: Marca) =>
    setEst((p) => ({
      ...p,
      hermanos: p.hermanos.map((h) => {
        if (!seleccion.has(h.id)) return h;
        const asis = { ...h.asis };
        for (const a of p.aniosAsis) asis[a] = { exc: m, sm: m };
        return { ...h, asis };
      }),
    }));

  const ponerCuotaSeleccion = (c: Cuota) =>
    setEst((p) => ({
      ...p,
      hermanos: p.hermanos.map((h) => {
        if (!seleccion.has(h.id)) return h;
        const cuotas = { ...h.cuotas };
        for (const a of p.aniosCuotas) cuotas[a] = c;
        return { ...h, cuotas };
      }),
    }));

  const aplicar = (fn: () => void) => {
    fn();
    limpiarSeleccion();
  };

  return (
    <>
      {seleccion.size > 0 && (
        <div className="bulk">
          <span className="bulk__contador">
            {seleccion.size} {seleccion.size === 1 ? "seleccionado" : "seleccionados"}
          </span>
          <button
            className="btn bulk__peligro"
            onClick={eliminarSeleccion}
            title="Eliminar los hermanos seleccionados"
          >
            <Trash2 size={15} /> Eliminar
          </button>
          <button
            className="btn"
            onClick={() => aplicar(bajarSeleccion)}
            title="Mover los seleccionados al final de la lista; los titulares pasan a suplentes"
          >
            <CornerDownRight size={15} /> Bajar al final
          </button>
          <label>
            Bloque
            <select
              defaultValue=""
              onChange={(e) => {
                const v = e.target.value;
                if (esBloque(v)) aplicar(() => cambiarBloqueSeleccion(v));
              }}
              title="Cambiar de bloque los seleccionados"
            >
              <option value="" disabled>
                Cambiar a…
              </option>
              {BLOQUES.map((b) => (
                <option key={b} value={b}>
                  {ETIQUETA_BLOQUE[b]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Asistencia
            <select
              defaultValue=""
              onChange={(e) => {
                const v = e.target.value;
                if (v === "__vaciar__") aplicar(() => ponerMarcaSeleccion(""));
                else aplicar(() => ponerMarcaSeleccion(v as Marca));
              }}
              title="Marcar asistencia (V/F/FJ) a los seleccionados en todos los años"
            >
              <option value="" disabled>
                Poner tipo…
              </option>
              <option value="V">V · asistió</option>
              <option value="F">F · falta</option>
              <option value="FJ">FJ · justificada</option>
              <option value="__vaciar__">…quitar marcas</option>
            </select>
          </label>
          <label>
            Cuota
            <select
              defaultValue=""
              onChange={(e) => {
                const v = e.target.value;
                if (v === "__vaciar__") aplicar(() => ponerCuotaSeleccion(""));
                else aplicar(() => ponerCuotaSeleccion(v as Cuota));
              }}
              title="Marcar pagado/pendiente a los seleccionados en todos los años"
            >
              <option value="" disabled>
                Poner si pagó…
              </option>
              <option value="S">S · pagada</option>
              <option value="N">N · pendiente</option>
              <option value="__vaciar__">…quitar marcas</option>
            </select>
          </label>
          <button className="bulk__cerrar" onClick={limpiarSeleccion} title="Quitar la selección">
            <X size={16} />
          </button>
        </div>
      )}

      <table className="rejilla">
        <thead>
          <tr>
            <th className="th-check">
              <input
                type="checkbox"
                checked={todasMarcadas}
                onChange={alternarTodas}
                title={
                  todasMarcadas
                    ? "Quitar la selección"
                    : "Seleccionar los hermanos visibles"
                }
              />
            </th>
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
                <td className="td-check">
                  <input
                    type="checkbox"
                    checked={seleccion.has(h.id)}
                    onChange={() => alternarFila(h.id)}
                    title="Seleccionar este hermano"
                  />
                </td>
                <td className="num">
                  {editandoId === h.id ? (
                    <input
                      autoFocus
                      className="num-edit"
                      value={borradorNum}
                      title={pistaNum || `Entre ${rangoNum[0]} y ${rangoNum[1]}`}
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
    </>
  );
}