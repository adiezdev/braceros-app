import { Camera, Check } from "lucide-react";
import { motion } from "motion/react";
import { useRef } from "react";
import type { Dispatch, SetStateAction } from "react";

import { ETIQUETA_BLOQUE, PROCESIONES } from "../constants";
import { useVolcadoFoto, nombreProcesion, type SeccionFoto } from "../hooks/useVolcadoFoto";
import { claseCelda } from "../lib/marcas";
import type { CfgImpresion, Estado } from "../types";
import { Button } from "./ui/Button";
import { IconButton } from "./ui/IconButton";

interface Props {
  est: Estado;
  cfg: CfgImpresion;
  setEst: Dispatch<SetStateAction<Estado>>;
  onCerrar: () => void;
}

export function VolcadoFoto({ est, cfg, setEst, onCerrar }: Props) {
  const {
    esCuotas,
    seccion,
    procesion,
    anio,
    anios,
    leyendo,
    errores,
    acumulado,
    conMarca,
    conBaja,
    seleccionarModo,
    seleccionarSeccion,
    seleccionarProcesion,
    seleccionarAnio,
    elegirFotos,
    corregir,
    alternarBaja,
    guardar,
    descartar,
  } = useVolcadoFoto(est, cfg, setEst, onCerrar);
  const inputRef = useRef<HTMLInputElement>(null);

  const etiquetaColumna = esCuotas
    ? `Cuota ${anio}`
    : `${nombreProcesion(procesion)} ${anio}`;

  return (
    <motion.div
      className="volcado"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <motion.div
        className="volcado__panel"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <div className="volcado__top">
          <h3>
            <Camera size={16} /> Leer de la foto
          </h3>
          <IconButton tono="volcado" onClick={onCerrar} title="Cerrar" etiqueta="Cerrar" />
        </div>

        <div className="volcado__modos">
          <button
            className={`volcado__modo ${!esCuotas ? "is-activo" : ""}`}
            onClick={() => seleccionarModo("asistencia")}
          >
            Asistencia
          </button>
          <button
            className={`volcado__modo ${esCuotas ? "is-activo" : ""}`}
            onClick={() => seleccionarModo("cuotas")}
          >
            Cuotas
          </button>
        </div>

        <p className="volcado__ayuda">
          {esCuotas
            ? "Elige la sección y el año, selecciona varias fotos a la vez (una por página) y la IA lee el estado S/N de cada cuota. Revisa las dudosas antes de guardar."
            : "Elige la sección, la procesión y el año, selecciona varias fotos a la vez (una por página) y la IA las lee todas. Revisa las que marque como dudosas antes de guardar."}
        </p>

        <div className="volcado__controles">
          <label>
            Sección
            <select value={seccion} onChange={(e) => seleccionarSeccion(e.target.value as SeccionFoto)}>
              {(["HONORARIOS", "TITULARES", "SUPLENTES"] as SeccionFoto[]).map((s) => (
                <option key={s} value={s}>
                  {ETIQUETA_BLOQUE[s]}
                </option>
              ))}
            </select>
          </label>
          {!esCuotas && (
            <label>
              Procesión
              <select
                value={procesion}
                onChange={(e) => seleccionarProcesion(e.target.value as "exc" | "sm")}
              >
                {PROCESIONES.map((p) => (
                  <option key={p.clave} value={p.clave}>
                    {p.corto}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Año
            <select value={anio} onChange={(e) => seleccionarAnio(Number(e.target.value))}>
              {anios.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              void elegirFotos(e.target.files);
              e.target.value = "";
            }}
          />
          <Button fuerte onClick={() => inputRef.current?.click()} disabled={leyendo}>
            <Camera size={15} /> {leyendo ? "Leyendo…" : "Subir fotos"}
          </Button>
        </div>

        {leyendo && <p className="volcado__resumen">Procesando las fotos…</p>}

        {errores.length > 0 && (
          <ul className="volcado__errores">
            {errores.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        )}

        {acumulado.length > 0 && (
          <>
            <p className="volcado__resumen">
              {acumulado.length} filas leídas
              {conMarca > 0 && (
                <span className="volcado__duda">
                  {" "}
                  · {conMarca} con marca: repásalas pulsándolas si hace falta
                </span>
              )}
              {conBaja > 0 && (
                <span className="volcado__baja-info">
                  {" "}
                  · {conBaja} {conBaja === 1 ? "tachado" : "tachados"} para quitar de la lista
                </span>
              )}
            </p>
            <div className="volcado__tabla">
              <table className="rejilla">
                <thead>
                  <tr>
                    <th className="th-num">Nº</th>
                    <th>Nombre completo</th>
                    <th className="th-marca">{etiquetaColumna}</th>
                  </tr>
                </thead>
                <tbody>
                  {acumulado.map((f) => (
                    <tr key={f.id} className={f.quitar ? "volcado__fila-baja" : undefined}>
                      <td className="num">{f.n}</td>
                      <td className={f.quitar ? "volcado__tachado" : undefined}>
                        {f.nombre}
                      </td>
                      <td className="td-marca">
                        {f.quitar ? (
                          <button
                            className="m m--baja"
                            onClick={() => alternarBaja(f.id)}
                            title="Tachado: se quitará de la lista. Pulsa para revertir."
                          >
                            ✕
                          </button>
                        ) : (
                          <button
                            className={`m ${claseCelda(f.marca, esCuotas ? "cuota" : "marca")} ${
                              f.marca ? "m--duda" : ""
                            }`}
                            onClick={() => corregir(f.id)}
                            title={
                              esCuotas
                                ? "Pulsa para cambiar: vacío, S, N"
                                : "Pulsa para cambiar: vacío, V, F, FJ"
                            }
                          >
                            {f.marca || "·"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="volcado__acciones">
              <Button fuerte onClick={guardar}>
                <Check size={15} /> Guardar en la lista
              </Button>
              <Button onClick={descartar}>Descartar</Button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}