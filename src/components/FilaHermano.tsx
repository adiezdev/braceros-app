import { ChevronDown, ChevronUp, CornerDownRight, Trash2 } from "lucide-react";
import React from "react";

import { BLOQUES, ETIQUETA_BLOQUE } from "../constants";
import { esBloque } from "../lib/modelo";
import type { Hermano } from "../types";
import { LineaCupo } from "./LineaCupo";
import { Input } from "./ui/Input";
import { Select } from "./ui/Select";

interface Props {
  hermano: Hermano;
  indice: number;
  /** Número impreso para este puesto */
  numero: number;
  /** Total de hermanos (para deshabilitar "bajar") */
  totalHermanos: number;
  /** Si hay filtro activo, no se puede reordenar ni editar número */
  conRaya: boolean;

  // Selección
  seleccionado: boolean;
  onAlternar: (id: string) => void;

  // Edición de número
  editandoNumero: boolean;
  borrador: string;
  pista: string;
  rango: [number, number];
  onSetBorrador: (v: string) => void;
  onConfirmarNumero: (id: string) => void;
  onEnter: () => void;
  onEscape: () => void;
  onAbrirNumero: (indice: number) => void;

  // Campos editables
  onCambiarCampo: <C extends keyof Hermano>(id: string, campo: C, valor: Hermano[C]) => void;

  // Acciones de fila
  onMover: (indice: number, dir: -1 | 1) => void;
  onInsertarDebajo: (indice: number) => void;
  onBorrar: (id: string, nombre: string) => void;

  // Línea de cupo
  cupo: number;
  mostrarRaya: boolean;
  numeros: number[];
}

function FilaHermanoInner({
  hermano: h,
  indice: i,
  numero,
  totalHermanos,
  conRaya,
  seleccionado,
  onAlternar,
  editandoNumero,
  borrador,
  pista,
  rango,
  onSetBorrador,
  onConfirmarNumero,
  onEnter,
  onEscape,
  onAbrirNumero,
  onCambiarCampo,
  onMover,
  onInsertarDebajo,
  onBorrar,
  cupo,
  mostrarRaya,
  numeros,
}: Props) {
  return (
    <>
      <tr>
        <td className="td-check">
          <input
            type="checkbox"
            checked={seleccionado}
            onChange={() => onAlternar(h.id)}
            title="Seleccionar este hermano"
          />
        </td>
        <td className="num">
          {editandoNumero ? (
            <input
              autoFocus
              className="num-edit"
              value={borrador}
              title={pista || `Entre ${rango[0]} y ${rango[1]}`}
              onChange={(e) => onSetBorrador(e.target.value)}
              onBlur={() => onConfirmarNumero(h.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onEnter();
                  (e.target as HTMLInputElement).blur();
                } else if (e.key === "Escape") {
                  onEscape();
                  (e.target as HTMLInputElement).blur();
                }
              }}
            />
          ) : (
            <button
              className="num-enlace"
              onClick={() => onAbrirNumero(i)}
              disabled={!conRaya}
              title={`Marcar como ${h.bloque.toLowerCase() === "suplentes" ? "suplente" : "puesto"} nº…`}
            >
              {numero}
            </button>
          )}
        </td>
        <td>
          <Input
            value={h.nombre}
            placeholder="Nombre y apellidos"
            onChange={(e) => onCambiarCampo(h.id, "nombre", e.target.value)}
          />
        </td>
        <td>
          <Select
            className={`sel--${h.bloque.toLowerCase()}`}
            value={h.bloque}
            onChange={(e) => {
              const v = e.target.value;
              if (esBloque(v)) onCambiarCampo(h.id, "bloque", v);
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
            onChange={(e) => onCambiarCampo(h.id, "telefono", e.target.value)}
          />
        </td>
        <td>
          <Input
            value={h.notas}
            onChange={(e) => onCambiarCampo(h.id, "notas", e.target.value)}
          />
        </td>
        <td className="acc">
          <button
            onClick={() => onMover(i, -1)}
            disabled={!conRaya || i === 0}
            title="Subir un puesto"
          >
            <ChevronUp size={17} />
          </button>
          <button
            onClick={() => onMover(i, 1)}
            disabled={!conRaya || i === totalHermanos - 1}
            title="Bajar un puesto"
          >
            <ChevronDown size={17} />
          </button>
          <button
            onClick={() => onInsertarDebajo(i)}
            disabled={!conRaya}
            title="Insertar un hermano debajo"
          >
            <CornerDownRight size={17} />
          </button>
          <button
            className="acc--peligro"
            onClick={() => onBorrar(h.id, h.nombre)}
            title="Quitar de la lista"
          >
            <Trash2 size={17} />
          </button>
        </td>
      </tr>
      {mostrarRaya && i + 1 === cupo && (
        <LineaCupo numero={numeros[cupo - 1] ?? 0} columnas={7} />
      )}
    </>
  );
}

/** ponytail: shallow compare hermano prop + selection state to skip re-renders */
export const FilaHermano = React.memo(FilaHermanoInner, (prev, next) =>
  prev.hermano === next.hermano &&
  prev.numero === next.numero &&
  prev.seleccionado === next.seleccionado &&
  prev.editandoNumero === next.editandoNumero &&
  prev.borrador === next.borrador &&
  prev.indice === next.indice &&
  prev.conRaya === next.conRaya &&
  prev.totalHermanos === next.totalHermanos &&
  prev.cupo === next.cupo &&
  prev.mostrarRaya === next.mostrarRaya
);
