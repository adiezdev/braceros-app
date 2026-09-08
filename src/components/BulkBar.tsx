import { CornerDownRight, Trash2 } from "lucide-react";

import { BLOQUES, ETIQUETA_BLOQUE } from "../constants";
import { esBloque } from "../lib/modelo";
import type { Bloque, Cuota, Marca } from "../types";
import { Button } from "./ui/Button";
import { IconButton } from "./ui/IconButton";
import { Select } from "./ui/Select";

interface Props {
  cuantos: number;
  onEliminar: () => void;
  onBajarFinal: () => void;
  onBloque: (bloque: Bloque) => void;
  onMarca: (marca: Marca) => void;
  onCuota: (estado: Cuota) => void;
  onCerrar: () => void;
}

const VACIAR = "__vaciar__";

/** Barra flotante con las acciones sobre los hermanos seleccionados. */
export function BulkBar({
  cuantos,
  onEliminar,
  onBajarFinal,
  onBloque,
  onMarca,
  onCuota,
  onCerrar,
}: Props) {
  return (
    <div className="bulk">
      <span className="bulk__contador">
        {cuantos} {cuantos === 1 ? "seleccionado" : "seleccionados"}
      </span>

      <Button className="bulk__peligro" onClick={onEliminar} title="Eliminar los hermanos seleccionados">
        <Trash2 size={15} /> Eliminar
      </Button>

      <Button
        onClick={onBajarFinal}
        title="Mover los seleccionados al final de la lista; los titulares pasan a suplentes"
      >
        <CornerDownRight size={15} /> Bajar al final
      </Button>

      <label>
        Bloque
        <Select
          defaultValue=""
          onChange={(e) => {
            const valor = e.target.value;
            if (esBloque(valor)) onBloque(valor);
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
        </Select>
      </label>

      <label>
        Asistencia
        <Select
          defaultValue=""
          onChange={(e) => {
            const valor = e.target.value;
            onMarca(valor === VACIAR ? "" : (valor as Marca));
          }}
          title="Marcar asistencia (V/F/FJ) a los seleccionados en todos los años"
        >
          <option value="" disabled>
            Poner tipo…
          </option>
          <option value="V">V · asistió</option>
          <option value="F">F · falta</option>
          <option value="FJ">FJ · justificada</option>
          <option value={VACIAR}>…quitar marcas</option>
        </Select>
      </label>

      <label>
        Cuota
        <Select
          defaultValue=""
          onChange={(e) => {
            const valor = e.target.value;
            onCuota(valor === VACIAR ? "" : (valor as Cuota));
          }}
          title="Marcar pagado/pendiente a los seleccionados en todos los años"
        >
          <option value="" disabled>
            Poner si pagó…
          </option>
          <option value="S">S · pagada</option>
          <option value="N">N · pendiente</option>
          <option value={VACIAR}>…quitar marcas</option>
        </Select>
      </label>

      <IconButton tono="bulk" onClick={onCerrar} title="Quitar la selección" />
    </div>
  );
}