import type { Dispatch, SetStateAction } from "react";
import { RotateCcw } from "lucide-react";

import { useBorrarPermanente } from "../hooks/useBorrarPermanente";
import { useReactivar } from "../hooks/useReactivar";
import { useSeleccion } from "../hooks/useSeleccion";
import { BulkBar } from "../components/BulkBar";
import { Button } from "../components/ui/Button";
import type { Estado } from "../types";

interface Props {
  est: Estado;
  setEst: Dispatch<SetStateAction<Estado>>;
}

export function ArchivadosView({ est, setEst }: Props) {
  const { seleccion, alternar, alternarTodas, todasMarcadas, limpiar } = useSeleccion();
  const reactivar = useReactivar(setEst);
  const borrar = useBorrarPermanente(setEst);

  const ids = est.archivados.map((a) => a.id);
  const todas = todasMarcadas(ids);

  if (!ids.length) {
    return (
      <div className="vacio">
        <p>No hay hermanos archivados.</p>
        <p className="vacio__ayuda">
          Cuando borres a un hermano de la lista, pasa a esta pestaña congelando
          su número y bloque.
        </p>
      </div>
    );
  }

  const borrarSeleccion = () =>
    void borrar(
      [...seleccion],
      est.archivados.filter((a) => seleccion.has(a.id)).map((a) => a.nombre),
    ).then(limpiar);

  return (
    <div className="archivados-wrap">
      {seleccion.size > 0 && (
        <BulkBar
          variante="archivados"
          cuantos={seleccion.size}
          onEliminar={borrarSeleccion}
          onCerrar={limpiar}
        />
      )}

      <table className="rejilla archivados-tabla">
        <thead>
          <tr>
            <th className="th-check">
              <input
                type="checkbox"
                checked={todas}
                onChange={() => alternarTodas(ids)}
                title={todas ? "Quitar la selección" : "Seleccionar todos los archivados"}
              />
            </th>
            <th className="th-num">Nº</th>
            <th>Nombre</th>
            <th className="th-bloque">Bloque</th>
            <th className="th-acc">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {est.archivados.map((a) => (
            <tr key={a.id}>
              <td className="td-check">
                <input
                  type="checkbox"
                  checked={seleccion.has(a.id)}
                  onChange={() => alternar(a.id)}
                  title="Seleccionar este archivado"
                />
              </td>
              <td className="num">{a.numero}</td>
              <td className="archivados-nombre">{a.nombre}</td>
              <td>{a.bloque}</td>
              <td className="acc">
                <Button
                  fino
                  onClick={() => void reactivar(a.id, a.nombre)}
                  title="Reactivar: vuelve a la lista activa"
                >
                  <RotateCcw size={13} /> Reactivar
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}