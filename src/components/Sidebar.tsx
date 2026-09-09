import {
  Archive,
  CalendarCheck,
  CircleDollarSign,
  ClipboardList,
  Printer,
  Settings,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { Pestana } from "../types";

interface Props {
  actual: Pestana;
  onIr: (p: Pestana) => void;
  abierta: boolean;
  onCerrar: () => void;
}

const SECCIONES: [Pestana, string, LucideIcon][] = [
  ["hermanos", "Hermanos", Users],
  ["cuotas", "Cuotas", CircleDollarSign],
  ["asistencias", "Asistencias", CalendarCheck],
  ["archivados", "Archivados", Archive],
  ["imprimir", "Listado en papel", Printer],
  ["lista", "Lista", ClipboardList],
  ["configuracion", "Configuración", Settings],
];

export function Sidebar({ actual, onIr, abierta, onCerrar }: Props) {
  return (
    <>
      {abierta && <div className="sidebar__fondo" onClick={onCerrar} />}
      <aside className={`sidebar ${abierta ? "sidebar--abierta" : ""}`}>
        <nav className="sidebar__nav">
          {SECCIONES.map(([k, etiqueta, Icono]) => (
            <button
              key={k}
              className={`sidebar__item ${actual === k ? "sidebar__item--activa" : ""}`}
              onClick={() => onIr(k)}
              title={etiqueta}
            >
              <Icono size={16} />
              <span className="sidebar__etiqueta">{etiqueta}</span>
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}