import { Download, RotateCcw, Upload } from "lucide-react";

import { Button } from "../components/ui/Button";

interface Props {
  onExportar: () => void;
  onRestaurar: () => void;
  onCargarExcel: () => void;
  guardando: boolean;
}

export function ListaView({ onExportar, onRestaurar, onCargarExcel, guardando }: Props) {
  return (
    <div className="vista-acciones">
      <div className="vista-acciones__cabecera">
        <h2>Lista</h2>
        <p>Gestiona el Excel maestro de la lista de hermanos.</p>
      </div>

      <div className="vista-acciones__botones">
        <Button fuerte onClick={onExportar} disabled={guardando}>
          {guardando ? (
            <span className="btn__spinner" aria-hidden="true" />
          ) : (
            <Download size={16} />
          )}
          {guardando ? "Guardando…" : "Guardar Excel"}
        </Button>

        <Button onClick={onRestaurar} disabled={guardando}>
          <RotateCcw size={16} /> Restaurar lista
        </Button>

        <Button onClick={onCargarExcel} disabled={guardando} title="Sustituir todo por el contenido de un Excel">
          <Upload size={16} /> Cargar otro Excel
        </Button>
      </div>
    </div>
  );
}