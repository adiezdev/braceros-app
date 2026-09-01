import { Printer } from "lucide-react";

import type { CfgImpresion, Estado, TipoListado } from "../types";
import { VistaImpresion } from "./VistaImpresion";

interface Props {
  est: Estado;
  cfg: CfgImpresion;
  setCfg: React.Dispatch<React.SetStateAction<CfgImpresion>>;
}

export function PanelImpresion({ est, cfg, setCfg }: Props) {
  return (
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
          Año en blanco
          <input
            type="number"
            value={cfg.anioNuevo}
            onChange={(e) => setCfg((c) => ({ ...c, anioNuevo: Number(e.target.value) }))}
          />
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

        <button className="btn btn--fuerte" onClick={() => window.print()}>
          <Printer size={15} /> Imprimir o guardar en PDF
        </button>
      </div>

      <p className="panel-impr__nota">
        Sale partido en los tres bloques, con el año que elijas ya rellenado y columnas
        vacías para el nuevo. La cabecera se repite en cada página. Desde el diálogo de
        impresión puedes guardarlo en PDF.
      </p>

      <div className="previa">
        <VistaImpresion est={est} cfg={cfg} />
      </div>
    </div>
  );
}
