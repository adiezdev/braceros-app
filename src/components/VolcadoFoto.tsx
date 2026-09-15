import { Camera, Check, Plus, X } from "lucide-react";
import { motion } from "motion/react";
import { useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import { PROCESIONES } from "../constants";
import {
  useVolcadoFoto,
  nombreProcesion,
  type ColumnaSeleccion,
} from "../hooks/useVolcadoFoto";
import { normalizarNombre } from "../lib/alinear";
import { claseCelda } from "../lib/marcas";
import type { CfgImpresion, Estado } from "../types";
import { Button } from "./ui/Button";
import { IconButton } from "./ui/IconButton";
import { Select } from "./ui/Select";

interface Props {
  est: Estado;
  cfg: CfgImpresion;
  setEst: Dispatch<SetStateAction<Estado>>;
  onCerrar: () => void;
}

const etiquetaColumna = (c: ColumnaSeleccion, esCuotas: boolean) =>
  esCuotas ? `Cuota ${c.anio}` : `${nombreProcesion(c.procesion ?? "exc")} ${c.anio}`;

export function VolcadoFoto({ est, cfg, setEst, onCerrar }: Props) {
  const {
    esCuotas,
    columnas,
    leyendo,
    errores,
    omitidos,
    lista,
    acumulado,
    conMarca,
    conBaja,
    seleccionarModo,
    anadirColumna,
    quitarColumna,
    cambiarColumna,
    elegirFotos,
    corregir,
    alternarBaja,
    anadir,
    emparejar,
    guardar,
    descartar,
  } = useVolcadoFoto(est, cfg, setEst, onCerrar);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busquedas, setBusquedas] = useState<Record<string, string>>({});

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
            ? "Elige una columna de marcas por año de cuota (vale cualquier año, también anterior). Selecciona varias fotos a la vez (una por página) y la IA lee todas las columnas de un tirón. Revisa las dudosas antes de guardar."
            : "Elige una columna de marcas por año y procesión (vale cualquier año). Selecciona varias fotos a la vez y la IA lee todas las columnas de un tirón. Revisa las que marque como dudosas antes de guardar."}
        </p>

        <div className="volcado__controles volcado__controles--col">
          {columnas.map((c, i) => (
            <div key={i} className="volcado__columna">
              {!esCuotas && (
                <Select
                  className="select"
                  value={c.procesion ?? "exc"}
                  onChange={(e) =>
                    cambiarColumna(i, { procesion: e.target.value as "exc" | "sm" })
                  }
                >
                  {PROCESIONES.map((p) => (
                    <option key={p.clave} value={p.clave}>
                      {p.corto}
                    </option>
                  ))}
                </Select>
              )}
              <input
                className="input"
                type="number"
                min={1900}
                max={2100}
                value={Number.isFinite(c.anio) ? c.anio : ""}
                onChange={(e) => cambiarColumna(i, { anio: Number(e.target.value) })}
              />
              <input
                className="input"
                type="number"
                min={0}
                max={30}
                value={c.indice}
                onChange={(e) => cambiarColumna(i, { indice: Number(e.target.value) })}
                title="Columna en el papel (0 = la del Nº)"
              />
              <IconButton tono="volcado" onClick={() => quitarColumna(i)} title="Quitar columna" etiqueta="Quitar">
                <X size={14} />
              </IconButton>
            </div>
          ))}
          <Button onClick={anadirColumna}>
            <Plus size={15} /> Añadir columna
          </Button>
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

        {omitidos.length > 0 && (
          <div className="volcado__omitidos">
            <p className="volcado__ayuda">
              {omitidos.length} {omitidos.length === 1 ? "nombre de la hoja no está" : "nombres de la hoja no están"} en la lista actual. O lo añades, o dile a quién corresponde (si el nombre tiene una errata o un apellido mal):
            </p>
            {omitidos.map((nombre) => {
              const texto = busquedas[nombre] ?? "";
              const coinciden =
                texto.trim().length > 0
                  ? lista
                      .filter((h) => normalizarNombre(h.nombre).includes(normalizarNombre(texto)))
                      .slice(0, 5)
                  : [];
              return (
                <div key={nombre} className="volcado__omitido">
                  <span>{nombre}</span>
                  <Button fino onClick={() => anadir(nombre)} title="Da de alta a esta persona en la lista (Suplentes)">
                    Añadir
                  </Button>
                  <div className="volcado__busca">
                    <input
                      className="input"
                      type="text"
                      placeholder="es alguien de la lista…"
                      value={texto}
                      onChange={(e) => setBusquedas((p) => ({ ...p, [nombre]: e.target.value }))}
                    />
                    {texto.trim().length > 0 && (
                      <ul className="volcado__buscas">
                        {coinciden.length === 0 && (
                          <li className="volcado__buscas-vacio">Sin coincidencias</li>
                        )}
                        {coinciden.map((h) => (
                          <li key={h.id}>
                            <button
                              onClick={() => {
                                emparejar(nombre, h.id);
                                setBusquedas((p) => ({ ...p, [nombre]: "" }));
                              }}
                            >
                              {h.n}. {h.nombre}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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
                    {columnas.map((c, j) => (
                      <th key={j} className="th-marca">
                        {etiquetaColumna(c, esCuotas)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {acumulado.map((f) => (
                    <tr key={f.id} className={f.quitar ? "volcado__fila-baja" : undefined}>
                      <td className="num">{f.n}</td>
                      <td className={f.quitar ? "volcado__tachado" : undefined}>
                        {f.nombre}
                      </td>
                      {columnas.map((_, j) => (
                        <td key={j} className="td-marca">
                          {f.quitar ? (
                            j === 0 ? (
                              <button
                                className="m m--baja"
                                onClick={() => alternarBaja(f.id)}
                                title="Tachado: se quitará de la lista. Pulsa para revertir."
                              >
                                ✕
                              </button>
                            ) : (
                              <span className="m">·</span>
                            )
                          ) : (
                            <button
                              className={`m ${claseCelda(f.marcas[j], esCuotas ? "cuota" : "marca")} ${
                                f.marcas[j] ? "m--duda" : ""
                              }`}
                              onClick={() => corregir(f.id, j)}
                              title={
                                esCuotas
                                  ? "Pulsa para cambiar: vacío, S, N"
                                  : "Pulsa para cambiar: vacío, V, F, FJ"
                              }
                            >
                              {f.marcas[j] || "·"}
                            </button>
                          )}
                        </td>
                      ))}
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