import { Maximize, Minimize, Moon, Sun } from "lucide-react";

import { Button } from "../components/ui/Button";
import type { Tema } from "../hooks/useTema";

interface Props {
  tema: Tema;
  onAlternarTema: () => void;
  ocultar: boolean;
  onAlternarPantalla: () => void;
}

export function ConfigView({ tema, onAlternarTema, ocultar, onAlternarPantalla }: Props) {
  const oscuro = tema === "dark";

  return (
    <div className="vista-acciones">
      <div className="vista-acciones__cabecera">
        <h2>Configuración</h2>
        <p>Ajusta la apariencia de la aplicación.</p>
      </div>

      <div className="vista-fila">
        <div className="vista-fila__texto">
          <span className="vista-fila__etiqueta">Tema</span>
          <span className="vista-fila__detalle">{oscuro ? "Oscuro" : "Claro"}</span>
        </div>
        <Button fino onClick={onAlternarTema} title={oscuro ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}>
          {oscuro ? <Sun size={15} /> : <Moon size={15} />}
          {oscuro ? "Tema claro" : "Tema oscuro"}
        </Button>
      </div>

      <div className="vista-fila">
        <div className="vista-fila__texto">
          <span className="vista-fila__etiqueta">Pantalla completa</span>
          <span className="vista-fila__detalle">
            {ocultar ? "Resumen oculto" : "Resumen visible"}
          </span>
        </div>
        <Button fino onClick={onAlternarPantalla} title={ocultar ? "Volver a ver el resumen" : "Ocultar el resumen y ganar espacio"}>
          {ocultar ? <Minimize size={15} /> : <Maximize size={15} />}
          {ocultar ? "Salir" : "Entrar"}
        </Button>
      </div>
    </div>
  );
}