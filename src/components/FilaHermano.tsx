import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, ChevronUp, CornerDownRight, Trash2 } from "lucide-react";
import React from "react";

import { BLOQUES, ETIQUETA_BLOQUE } from "../constants";
import { esBloque } from "../lib/modelo";
import type { Hermano } from "../types";
import { LineaCupo } from "./LineaCupo";
import { Input } from "./ui/Input";
import { MenuFila } from "./ui/MenuFila";
import { Select } from "./ui/Select";

export interface EdicionNumero {
  editandoNumero: boolean;
  borrador: string;
  pista: string;
  rango: [number, number];
  onSetBorrador: (v: string) => void;
  onConfirmarNumero: (id: string) => void;
  onEnter: () => void;
  onEscape: () => void;
  onAbrirNumero: (indice: number) => void;
}

export interface AccionesFila {
  onMover: (indice: number, dir: -1 | 1) => void;
  onInsertarDebajo: (indice: number) => void;
  onBorrar: (id: string, nombre: string) => void;
  onCambiarCampo: <C extends keyof Hermano>(id: string, campo: C, valor: Hermano[C]) => void;
}

interface Props {
  hermano: Hermano;
  indice: number;
  numero: number;
  totalHermanos: number;
  conRaya: boolean;
  seleccionado: boolean;
  onAlternar: (id: string) => void;
  edicion: EdicionNumero;
  acciones: AccionesFila;
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
  edicion,
  acciones,
  cupo,
  mostrarRaya,
  numeros,
}: Props) {
  const {
    editandoNumero, borrador, pista, rango,
    onSetBorrador, onConfirmarNumero, onEnter, onEscape, onAbrirNumero,
  } = edicion;
  const { onMover, onInsertarDebajo, onBorrar, onCambiarCampo } = acciones;

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
        <td className="td-nombre">
          <Input
            value={h.nombre}
            placeholder="Nombre y apellidos"
            onChange={(e) => onCambiarCampo(h.id, "nombre", e.target.value)}
          />
        </td>
        <td className="td-bloque">
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
        <td className="td-tel">
          <Input
            className="txt--corto"
            value={h.telefono}
            onChange={(e) => onCambiarCampo(h.id, "telefono", e.target.value)}
          />
        </td>
        <td className="td-obs">
          <Input
            value={h.notas}
            onChange={(e) => onCambiarCampo(h.id, "notas", e.target.value)}
          />
        </td>
        <td className="acc">
          <MenuFila>
            <DropdownMenu.Item
              className="menu__item"
              onSelect={() => onMover(i, -1)}
              disabled={!conRaya || i === 0}
            >
              <ChevronUp size={15} /> Subir un puesto
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className="menu__item"
              onSelect={() => onMover(i, 1)}
              disabled={!conRaya || i === totalHermanos - 1}
            >
              <ChevronDown size={15} /> Bajar un puesto
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className="menu__item"
              onSelect={() => onInsertarDebajo(i)}
              disabled={!conRaya}
            >
              <CornerDownRight size={15} /> Insertar hermano debajo
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="menu__sep" />
            <DropdownMenu.Item
              className="menu__item menu__item--peligro"
              onSelect={() => onBorrar(h.id, h.nombre)}
            >
              <Trash2 size={15} /> Quitar de la lista
            </DropdownMenu.Item>
          </MenuFila>
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
  prev.edicion.editandoNumero === next.edicion.editandoNumero &&
  prev.edicion.borrador === next.edicion.borrador &&
  prev.indice === next.indice &&
  prev.conRaya === next.conRaya &&
  prev.totalHermanos === next.totalHermanos &&
  prev.cupo === next.cupo &&
  prev.mostrarRaya === next.mostrarRaya
);
