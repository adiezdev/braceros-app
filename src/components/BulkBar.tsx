import { CornerDownRight, Trash2 } from "lucide-react";
import { motion } from "motion/react";

import { BLOQUES, ETIQUETA_BLOQUE } from "../constants";
import { esBloque } from "../lib/modelo";
import type { Bloque, Cuota, Marca } from "../types";
import { Button } from "./ui/Button";
import { IconButton } from "./ui/IconButton";
import { Select } from "./ui/Select";

interface Props {
  variante?: "lista" | "archivados";
  cuantos: number;
  onEliminar: () => void;
  onBajarFinal?: () => void;
  onBloque?: (bloque: Bloque) => void;
  onMarca?: (marca: Marca) => void;
  onCuota?: (estado: Cuota) => void;
  onCerrar: () => void;
}

const VACIAR = "__vaciar__";

/** Barra flotante con las acciones sobre los hermanos seleccionados. */
export function BulkBar({
  variante = "lista",
  cuantos,
  onEliminar,
  onBajarFinal,
  onBloque,
  onMarca,
  onCuota,
  onCerrar,
}: Props) {
  return (
    <motion.div
      className="bulk"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <span className="bulk__contador">
        {cuantos} {cuantos === 1 ? "seleccionado" : "seleccionados"}
      </span>

      <Button
        className="bulk__peligro"
        onClick={onEliminar}
        title={
          variante === "archivados"
            ? "Borrar definitivamente los seleccionados: no se puede deshacer"
            : "Eliminar los hermanos seleccionados"
        }
      >
        <Trash2 size={15} /> {variante === "archivados" ? "Borrar para siempre" : "Eliminar"}
      </Button>

      {variante === "lista" && onBajarFinal && (
        <Button
          onClick={onBajarFinal}
          title="Mover los seleccionados al final de la lista; los titulares pasan a suplentes"
        >
          <CornerDownRight size={15} /> Bajar al final
        </Button>
      )}

      {variante === "lista" && onBloque && (
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
      )}

      {variante === "lista" && onMarca && (
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
      )}

      {variante === "lista" && onCuota && (
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
      )}

      <IconButton tono="bulk" onClick={onCerrar} title="Quitar la selección" etiqueta="Cerrar selección" />
    </motion.div>
  );
}