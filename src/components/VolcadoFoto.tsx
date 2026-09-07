import { useMemo, useRef, useState } from "react";
import { Camera, Check, X } from "lucide-react";

import { PROCESIONES } from "../constants";
import { leerFotos, type Alineable } from "../lib/foto";
import { siguienteCuota, siguienteMarca } from "../lib/modelo";
import type {
  CfgImpresion,
  ClaveProcesion,
  Cuota,
  Estado,
  FilaLeida,
  Marca,
} from "../types";

interface Props {
  est: Estado;
  cfg: CfgImpresion;
  setEst: React.Dispatch<React.SetStateAction<Estado>>;
  onCerrar: () => void;
}

type Modo = "asistencia" | "cuotas";

/** Orden de columnas de marcas de asistencia tal y como salen en la hoja impresa. */
function columnasMarca(cfg: CfgImpresion): { anio: number; procesion: ClaveProcesion }[] {
  return [
    { anio: cfg.anioAnterior, procesion: "exc" as ClaveProcesion },
    { anio: cfg.anioAnterior, procesion: "sm" as ClaveProcesion },
    ...cfg.aniosNuevos.flatMap((a) => [
      { anio: a, procesion: "exc" as ClaveProcesion },
      { anio: a, procesion: "sm" as ClaveProcesion },
    ]),
  ];
}

const nombreProcesion = (c: ClaveProcesion) =>
  PROCESIONES.find((p) => p.clave === c)?.corto ?? c;

export function VolcadoFoto({ est, cfg, setEst, onCerrar }: Props) {
  const columnas = useMemo(() => columnasMarca(cfg), [cfg]);
  const [modo, setModo] = useState<Modo>("asistencia");
  const [procesion, setProcesion] = useState<ClaveProcesion>("exc");
  const [anio, setAnio] = useState(columnas[0]?.anio ?? 0);
  const [leyendo, setLeyendo] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);
  const [acumulado, setAcumulado] = useState<FilaLeida[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const esCuotas = modo === "cuotas";
  const anios = esCuotas ? est.aniosCuotas : [...new Set(columnas.map((c) => c.anio))];

  const seleccion = `${anio}_${procesion}`;
  const indiceColumna = columnas.findIndex(
    (c) => `${c.anio}_${c.procesion}` === seleccion
  );

  const lista: Alineable[] = useMemo(
    () => est.hermanos.map((h, i) => ({ id: h.id, n: i + 1, nombre: h.nombre })),
    [est.hermanos]
  );

  const alElegirFotos = async (files: FileList | null | undefined) => {
    const archivos = Array.from(files ?? []);
    if (!archivos.length) return;
    if (!esCuotas && indiceColumna < 0) return;
    setLeyendo(true);
    setErrores([]);
    try {
      const { filas, errores } = await leerFotos(archivos, lista, {
        indiceColumna,
        tipo: modo,
      });
      setErrores(errores);
      // Se acumulan páginas; si un mismo hermano sale en dos páginas, la última vale.
      setAcumulado((prev) => {
        const porId = new Map(prev.map((f) => [f.id, f]));
        for (const f of filas) porId.set(f.id, f);
        return [...porId.values()];
      });
    } catch (e) {
      setErrores([e instanceof Error ? e.message : "No he podido leer las fotos."]);
    } finally {
      setLeyendo(false);
    }
  };

  const corregir = (id: string) => {
    setAcumulado((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const marca = esCuotas
          ? siguienteCuota(f.marca as Cuota)
          : siguienteMarca(f.marca as Marca);
        return { ...f, marca: marca as Marca | Cuota };
      })
    );
  };

  const guardar = () => {
    if (!acumulado.length) return;
    setEst((p) => ({
      ...p,
      hermanos: p.hermanos.map((h) => {
        const leida = acumulado.find((f) => f.id === h.id);
        if (!leida) return h;
        if (esCuotas) {
          return { ...h, cuotas: { ...h.cuotas, [anio]: leida.marca as Cuota } };
        }
        const prev = h.asis?.[anio] ?? { exc: "" as Marca, sm: "" as Marca };
        return {
          ...h,
          asis: { ...h.asis, [anio]: { ...prev, [procesion]: leida.marca as Marca } },
        };
      }),
    }));
    onCerrar();
  };

  const conMarca = acumulado.filter((f) => f.marca).length;
  const cambioModo = (m: Modo) => {
    setModo(m);
    setAcumulado([]);
    setErrores([]);
    if (m === "cuotas") setAnio(est.aniosCuotas[0] ?? columnas[0]?.anio ?? 0);
    else setAnio(columnas[0]?.anio ?? 0);
  };

  return (
    <div className="volcado">
      <div className="volcado__panel">
      <div className="volcado__top">
        <h3>
          <Camera size={16} /> Leer de la foto
        </h3>
        <button className="volcado__cerrar" onClick={onCerrar} title="Cerrar">
          <X size={15} />
        </button>
      </div>

      <div className="volcado__modos">
        <button
          className={`volcado__modo ${!esCuotas ? "is-activo" : ""}`}
          onClick={() => cambioModo("asistencia")}
        >
          Asistencia
        </button>
        <button
          className={`volcado__modo ${esCuotas ? "is-activo" : ""}`}
          onClick={() => cambioModo("cuotas")}
        >
          Cuotas
        </button>
      </div>

      <p className="volcado__ayuda">
        {esCuotas
          ? "Elige el año de las cuotas, selecciona varias fotos a la vez (una por página) y la IA lee el estado S/N de cada cuota. Revisa las dudosas antes de guardar."
          : "Elige a qué procesión y año corresponde la hoja, selecciona varias fotos a la vez (una por página) y la IA las lee todas. Revisa las que marque como dudosas antes de guardar."}
      </p>

      <div className="volcado__controles">
        {!esCuotas && (
          <label>
            Procesión
            <select
              value={procesion}
              onChange={(e) => setProcesion(e.target.value as ClaveProcesion)}
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
          <select value={anio} onChange={(e) => setAnio(Number(e.target.value))}>
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
            void alElegirFotos(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          className="btn btn--fuerte"
          onClick={() => inputRef.current?.click()}
          disabled={leyendo}
        >
          <Camera size={15} /> {leyendo ? "Leyendo…" : "Subir fotos"}
        </button>
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
          </p>
          <div className="volcado__tabla">
            <table className="rejilla">
              <thead>
                <tr>
                  <th className="th-num">Nº</th>
                  <th>Nombre completo</th>
                  <th className="th-marca">
                    {esCuotas ? `Cuota ${anio}` : `${nombreProcesion(procesion)} ${anio}`}
                  </th>
                </tr>
              </thead>
              <tbody>
                {acumulado.map((f) => (
                  <tr key={f.id}>
                    <td className="num">{f.n}</td>
                    <td>{f.nombre}</td>
                    <td className="td-marca">
                      <button
                        className={`m ${claseMarca(f.marca)} ${f.marca ? "m--duda" : ""}`}
                        onClick={() => corregir(f.id)}
                        title={
                          esCuotas
                            ? "Pulsa para cambiar: vacío, S, N"
                            : "Pulsa para cambiar: vacío, V, F, FJ"
                        }
                      >
                        {f.marca || "·"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="volcado__acciones">
            <button className="btn btn--fuerte" onClick={guardar}>
              <Check size={15} /> Guardar en la lista
            </button>
            <button className="btn" onClick={() => setAcumulado([])}>
              Descartar
            </button>
          </div>
        </>
      )}
      </div>
    </div>
  );
}

function claseMarca(m: Marca | Cuota): string {
  switch (m) {
    case "V":
      return "m--si";
    case "F":
      return "m--no";
    case "FJ":
      return "m--just";
    case "S":
      return "m--si";
    case "N":
      return "m--no";
    default:
      return "m--vacia";
  }
}