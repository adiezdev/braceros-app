import { Download, Plus, RotateCcw, Search, Upload, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Aviso as AvisoUI } from "./components/Aviso";
import { PanelImpresion } from "./components/PanelImpresion";
import { Resumen } from "./components/Resumen";
import { TablaAsistencias } from "./components/TablaAsistencias";
import { TablaCuotas } from "./components/TablaCuotas";
import { TablaHermanos } from "./components/TablaHermanos";
import { VistaImpresion } from "./components/VistaImpresion";
import { ANIO_BASE, CLAVE_GUARDADO, ENTIDAD } from "./constants";
import { almacen } from "./lib/almacen";
import { descargarLibro, leerLibro } from "./lib/libro";
import { crearHermano, estadoInicial } from "./lib/modelo";
import type { Aviso, CfgImpresion, Estado, Pestana } from "./types";

const PESTANAS: [Pestana, string][] = [
  ["hermanos", "Hermanos"],
  ["cuotas", "Cuotas"],
  ["asistencias", "Asistencias"],
  ["imprimir", "Listado en papel"],
];

export default function App() {
  const [est, setEst] = useState<Estado>(estadoInicial);
  const [pestana, setPestana] = useState<Pestana>("hermanos");
  const [filtro, setFiltro] = useState("");
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [cargado, setCargado] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [cfgImpr, setCfgImpr] = useState<CfgImpresion>({
    tipo: "asistencias",
    anioAnterior: ANIO_BASE,
    anioNuevo: ANIO_BASE + 1,
    blancos: 20,
  });

  /* --- persistencia ---------------------------------------------- */
  useEffect(() => {
    let vivo = true;
    almacen.leer<Estado>(CLAVE_GUARDADO).then((guardado) => {
      if (!vivo) return;
      if (guardado?.hermanos?.length) setEst(guardado);
      setCargado(true);
    });
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    if (cargado) void almacen.escribir(CLAVE_GUARDADO, est);
  }, [est, cargado]);

  /* --- acciones --------------------------------------------------- */
  const importar = useCallback(async (file: File | undefined) => {
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const nuevo = await leerLibro(new Uint8Array(buf));
      if (!nuevo.hermanos.length) {
        setAviso({ tono: "error", texto: "La hoja Hermanos no tiene ningún nombre." });
        return;
      }
      setEst(nuevo);
      const ultimo = Math.max(...nuevo.aniosAsis, ...nuevo.aniosCuotas);
      setCfgImpr((c) => ({ ...c, anioAnterior: ultimo, anioNuevo: ultimo + 1 }));
      setAviso({
        tono: "ok",
        texto: `Cargados ${nuevo.hermanos.length} hermanos y los años ${nuevo.aniosAsis.join(", ")}.`,
      });
    } catch (e) {
      setAviso({
        tono: "error",
        texto: e instanceof Error ? e.message : "No he podido leer el fichero.",
      });
    }
  }, []);

  const exportar = useCallback(async () => {
    try {
      await descargarLibro(est);
      setAviso({ tono: "ok", texto: "Excel descargado." });
    } catch (e) {
      setAviso({
        tono: "error",
        texto: `No he podido generar el Excel: ${e instanceof Error ? e.message : "error"}`,
      });
    }
  }, [est]);

  const restaurar = useCallback(() => {
    const ok = window.confirm(
      "¿Volver a la lista transcrita de las hojas? Se pierden los cambios hechos aquí."
    );
    if (!ok) return;
    setEst(estadoInicial());
    setAviso({ tono: "ok", texto: "Lista restaurada tal como se transcribió." });
  }, []);

  const anadirHermano = useCallback(
    () => setEst((p) => ({ ...p, hermanos: [...p.hermanos, crearHermano()] })),
    []
  );

  const anadirAnio = useCallback((cual: "cuotas" | "asistencias") => {
    setEst((p) => {
      const clave = cual === "cuotas" ? "aniosCuotas" : "aniosAsis";
      const lista = p[clave];
      const siguiente = (lista.length ? Math.max(...lista) : ANIO_BASE) + 1;
      if (lista.includes(siguiente)) return p;
      return { ...p, [clave]: [...lista, siguiente].sort((a, b) => a - b) };
    });
  }, []);

  const quitarAnio = useCallback((cual: "cuotas" | "asistencias", anio: number) => {
    const que = cual === "cuotas" ? "las cuotas" : "las asistencias";
    if (!window.confirm(`¿Quitar ${que} de ${anio}? Se borran esas marcas.`)) return;
    setEst((p) => {
      const clave = cual === "cuotas" ? "aniosCuotas" : "aniosAsis";
      return {
        ...p,
        [clave]: p[clave].filter((a) => a !== anio),
        hermanos: p.hermanos.map((h) => {
          const cuotas = { ...h.cuotas };
          const asis = { ...h.asis };
          if (cual === "cuotas") delete cuotas[anio];
          else delete asis[anio];
          return { ...h, cuotas, asis };
        }),
      };
    });
  }, []);

  /* --- derivados -------------------------------------------------- */
  const cualAnios: "cuotas" | "asistencias" =
    pestana === "cuotas" ? "cuotas" : "asistencias";
  const aniosVista = useMemo(
    () => (pestana === "cuotas" ? est.aniosCuotas : est.aniosAsis),
    [pestana, est.aniosCuotas, est.aniosAsis]
  );

  const vacia = est.hermanos.length === 0;

  return (
    <>
      <div className="app">
        <header className="cabecera">
          <div className="cabecera__marca">
            <h1>{ENTIDAD}</h1>
            <p>
              Lista, cuotas y asistencia a la Exaltación de la Santa Cruz y a San Martín
            </p>
          </div>

          <div className="cabecera__acciones">
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xlsm,.xls"
              hidden
              onChange={(e) => {
                void importar(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <button className="btn btn--fuerte" onClick={() => void exportar()}>
              <Download size={15} /> Guardar Excel
            </button>
            <button className="btn" onClick={restaurar} title="Volver a la lista transcrita">
              <RotateCcw size={15} /> Restaurar lista
            </button>
            <button
              className="btn btn--fino"
              onClick={() => inputRef.current?.click()}
              title="Sustituir todo por el contenido de un Excel"
            >
              <Upload size={15} /> Cargar otro Excel
            </button>
          </div>
        </header>

        {aviso && (
          <AvisoUI tono={aviso.tono} onCerrar={() => setAviso(null)}>
            {aviso.texto}
          </AvisoUI>
        )}

        <Resumen est={est} />

        <nav className="pestanas">
          {PESTANAS.map(([k, t]) => (
            <button
              key={k}
              className={`pest ${pestana === k ? "pest--activa" : ""}`}
              onClick={() => setPestana(k)}
            >
              {t}
            </button>
          ))}
        </nav>

        {pestana !== "imprimir" && (
          <div className="barra">
            <label className="buscador">
              <Search size={15} />
              <input
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                placeholder="Buscar por nombre"
              />
            </label>

            {pestana === "hermanos" ? (
              <button className="btn btn--fino" onClick={anadirHermano}>
                <Plus size={15} /> Añadir hermano
              </button>
            ) : (
              <>
                <button className="btn btn--fino" onClick={() => anadirAnio(cualAnios)}>
                  <Plus size={15} /> Añadir año
                </button>
                <span className="anios">
                  {aniosVista.map((a) => (
                    <button
                      key={a}
                      className="anio-x"
                      onClick={() => quitarAnio(cualAnios, a)}
                      title={`Quitar ${a}`}
                    >
                      {a} <X size={11} />
                    </button>
                  ))}
                </span>
              </>
            )}

            {filtro.trim() && (
              <span className="nota-filtro">
                Con el buscador activo no se ve la raya del cupo ni se puede reordenar
              </span>
            )}
          </div>
        )}

        <main className="lienzo">
          {vacia && pestana !== "imprimir" ? (
            <div className="vacio">
              <p>No queda nadie en la lista.</p>
              <p className="vacio__ayuda">
                Restaura la transcripción original o empieza a añadir hermanos.
              </p>
              <div className="vacio__acciones">
                <button className="btn btn--fuerte" onClick={restaurar}>
                  <RotateCcw size={15} /> Restaurar lista
                </button>
                <button className="btn" onClick={anadirHermano}>
                  <Plus size={15} /> Añadir el primero
                </button>
              </div>
            </div>
          ) : (
            <>
              {pestana === "hermanos" && (
                <TablaHermanos est={est} setEst={setEst} filtro={filtro} />
              )}
              {pestana === "cuotas" && (
                <TablaCuotas est={est} setEst={setEst} filtro={filtro} />
              )}
              {pestana === "asistencias" && (
                <TablaAsistencias est={est} setEst={setEst} filtro={filtro} />
              )}
              {pestana === "imprimir" && (
                <PanelImpresion est={est} cfg={cfgImpr} setCfg={setCfgImpr} />
              )}
            </>
          )}
        </main>

        <footer className="pie">
          La lista viene dentro de la aplicación y los cambios se guardan en este
          navegador. Descarga el Excel cuando quieras una copia fuera de aquí.
        </footer>
      </div>

      {/* lo único que se manda a la impresora */}
      <div className="solo-impresion">
        <VistaImpresion est={est} cfg={cfgImpr} />
      </div>
    </>
  );
}
