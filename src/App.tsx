import { Download, Plus, RotateCcw, Search, Upload, X } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

import { Aviso as AvisoUI } from "./components/Aviso";
import { PanelImpresion } from "./components/PanelImpresion";
import { Resumen } from "./components/Resumen";
import { TablaAsistencias } from "./components/TablaAsistencias";
import { TablaCuotas } from "./components/TablaCuotas";
import { TablaHermanos } from "./components/TablaHermanos";
import { ANIO_BASE, ENTIDAD } from "./constants";
import { descargarLibro, leerLibro } from "./lib/libro";
import { crearHermano, estadoInicial } from "./lib/modelo";
import { useEstado } from "./lib/useEstado";
import type { Conexion } from "./lib/useEstado";
import type { Aviso, CfgImpresion, Pestana } from "./types";

const PESTANAS: [Pestana, string][] = [
  ["hermanos", "Hermanos"],
  ["cuotas", "Cuotas"],
  ["asistencias", "Asistencias"],
  ["imprimir", "Listado en papel"],
];

const TEXTO_CONEXION: Record<Conexion, string> = {
  cargando: "Cargando…",
  guardando: "Guardando…",
  guardado: "Guardado en el servidor",
  error: "Sin conexión con el servidor",
};

export default function App() {
  const { est, setEst, reemplazar, conexion, error, recargar } = useEstado();

  const [pestana, setPestana] = useState<Pestana>("hermanos");
  const [filtro, setFiltro] = useState("");
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [cfgImpr, setCfgImpr] = useState<CfgImpresion>({
    tipo: "asistencias",
    anioAnterior: ANIO_BASE,
    aniosNuevos: [ANIO_BASE + 1],
    blancos: 20,
  });

  /* --- acciones --------------------------------------------------- */
  const importar = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      try {
        const buf = await file.arrayBuffer();
        const nuevo = await leerLibro(new Uint8Array(buf));
        if (!nuevo.hermanos.length) {
          setAviso({ tono: "error", texto: "La hoja Hermanos no tiene ningún nombre." });
          return;
        }
        if (
          !window.confirm(
            `Esto sustituye la lista del servidor por los ${nuevo.hermanos.length} hermanos del Excel, para todo el mundo. ¿Sigo?`
          )
        ) {
          return;
        }
        reemplazar(nuevo);
        const ultimo = Math.max(...nuevo.aniosAsis, ...nuevo.aniosCuotas);
        setCfgImpr((c) => ({ ...c, anioAnterior: ultimo, aniosNuevos: [ultimo + 1] }));
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
    },
    [reemplazar]
  );

  const exportar = useCallback(async () => {
    if (!est) return;
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
      "¿Volver a la lista transcrita de las hojas? Se pierde lo apuntado en el servidor, para todo el mundo."
    );
    if (!ok) return;
    reemplazar(estadoInicial());
    setAviso({ tono: "ok", texto: "Lista restaurada tal como se transcribió." });
  }, [reemplazar]);

  const anadirHermano = useCallback(
    () => setEst((p) => ({ ...p, hermanos: [...p.hermanos, crearHermano()] })),
    [setEst]
  );

  const anadirAnio = useCallback(
    (cual: "cuotas" | "asistencias") => {
      if (!est) return;
      const clave = cual === "cuotas" ? "aniosCuotas" : "aniosAsis";
      const lista = est[clave];
      const sugerido = (lista.length ? Math.max(...lista) : ANIO_BASE) + 1;
      const entrar = window.prompt("¿Qué año quieres añadir?", String(sugerido));
      if (entrar === null) return;
      const anio = Number(entrar);
      if (!Number.isInteger(anio) || anio < 1900 || anio > 2200) {
        window.alert("Ese no parece un año válido.");
        return;
      }
      if (lista.includes(anio)) {
        window.alert(`El año ${anio} ya está.`);
        return;
      }
      setEst({ ...est, [clave]: [...lista, anio].sort((a, b) => a - b) });
    },
    [est, setEst]
  );

  const quitarAnio = useCallback(
    (cual: "cuotas" | "asistencias", anio: number) => {
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
    },
    [setEst]
  );

  /* --- derivados -------------------------------------------------- */
  const cualAnios: "cuotas" | "asistencias" =
    pestana === "cuotas" ? "cuotas" : "asistencias";

  const aniosVista = useMemo(() => {
    if (!est) return [];
    return pestana === "cuotas" ? est.aniosCuotas : est.aniosAsis;
  }, [pestana, est]);

  /* --- pantalla de carga ------------------------------------------ */
  if (!est) {
    return (
      <div className="arranque">
        <h1>{ENTIDAD}</h1>
        {conexion === "error" ? (
          <>
            <p className="arranque__error">{error ?? "No llego al servidor."}</p>
            <p className="arranque__ayuda">
              Los datos están en el NAS. Comprueba que estás en la VPN y que los
              contenedores siguen levantados.
            </p>
            <button className="btn btn--fuerte" onClick={recargar}>
              <RotateCcw size={15} /> Reintentar
            </button>
          </>
        ) : (
          <p>Cargando la lista…</p>
        )}
      </div>
    );
  }

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

        {conexion === "error" && (
          <AvisoUI tono="error" onCerrar={recargar}>
            {error ?? "Sin conexión con el servidor."} Lo que cambies ahora se
            reintenta solo; no cierres la pestaña hasta que vuelva.
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
          <span className={`estado estado--${conexion}`}>{TEXTO_CONEXION[conexion]}</span>
          <span>
            Los datos están en el NAS y los ve todo el mundo. Descarga el Excel
            cuando quieras una copia fuera de aquí.
          </span>
        </footer>
      </div>
    </>
  );
}
