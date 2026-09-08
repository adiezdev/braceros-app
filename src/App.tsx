import { Download, Plus, RotateCcw, Search, Upload, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { Aviso } from "./components/Aviso";
import { FabFoto } from "./components/FabFoto";
import { Resumen } from "./components/Resumen";
import { Button } from "./components/ui/Button";
import { VolcadoFoto } from "./components/VolcadoFoto";
import { ANIO_BASE, ENTIDAD } from "./constants";
import { useAccionesApp } from "./hooks/useAccionesApp";
import { useEstadoRemoto, type Conexion } from "./hooks/useEstadoRemoto";
import type { CfgImpresion, Pestana } from "./types";
import { AsistenciasView } from "./views/AsistenciasView";
import { CuotasView } from "./views/CuotasView";
import { HermanosView } from "./views/HermanosView";
import { ImprimirView } from "./views/ImprimirView";

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
  const { est, setEst, reemplazar, conexion, error, recargar } = useEstadoRemoto();

  const [pestana, setPestana] = useState<Pestana>("hermanos");
  const [filtro, setFiltro] = useState("");
  const [volcadoFoto, setVolcadoFoto] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [cfgImpr, setCfgImpr] = useState<CfgImpresion>({
    tipo: "asistencias",
    anioAnterior: ANIO_BASE,
    aniosNuevos: [ANIO_BASE + 1],
    blancos: 20,
  });

  const { importar, exportar, restaurar, anadirHermano, anadirAnio, quitarAnio } = useAccionesApp({
    est,
    setEst,
    reemplazar,
    setCfg: setCfgImpr,
  });

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
            <Button fuerte onClick={recargar}>
              <RotateCcw size={15} /> Reintentar
            </Button>
          </>
        ) : (
          <p>Cargando la lista…</p>
        )}
      </div>
    );
  }

  const vacia = est.hermanos.length === 0;

  return (
    <div className="app">
      {volcadoFoto && (
        <VolcadoFoto
          est={est}
          cfg={cfgImpr}
          setEst={setEst}
          onCerrar={() => setVolcadoFoto(false)}
        />
      )}

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
          <Button fuerte onClick={() => void exportar()}>
            <Download size={15} /> Guardar Excel
          </Button>
          <Button onClick={restaurar} title="Volver a la lista transcrita">
            <RotateCcw size={15} /> Restaurar lista
          </Button>
          <Button
            fino
            onClick={() => inputRef.current?.click()}
            title="Sustituir todo por el contenido de un Excel"
          >
            <Upload size={15} /> Cargar otro Excel
          </Button>
        </div>
      </header>

      {conexion === "error" && (
        <Aviso tono="error" onCerrar={recargar}>
          {error ?? "Sin conexión con el servidor."} Lo que cambies ahora se
          reintenta solo; no cierres la pestaña hasta que vuelva.
        </Aviso>
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
            <Button fino onClick={anadirHermano}>
              <Plus size={15} /> Añadir hermano
            </Button>
          ) : (
            <>
              <Button fino onClick={() => anadirAnio(cualAnios)}>
                <Plus size={15} /> Añadir año
              </Button>
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
              <Button fuerte onClick={restaurar}>
                <RotateCcw size={15} /> Restaurar lista
              </Button>
              <Button onClick={anadirHermano}>
                <Plus size={15} /> Añadir el primero
              </Button>
            </div>
          </div>
        ) : (
          <>
            {pestana === "hermanos" && <HermanosView est={est} setEst={setEst} filtro={filtro} />}
            {pestana === "cuotas" && <CuotasView est={est} setEst={setEst} filtro={filtro} />}
            {pestana === "asistencias" && (
              <AsistenciasView est={est} setEst={setEst} filtro={filtro} />
            )}
            {pestana === "imprimir" && (
              <ImprimirView est={est} cfg={cfgImpr} setCfg={setCfgImpr} />
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

      {pestana !== "imprimir" && <FabFoto onClick={() => setVolcadoFoto(true)} />}
    </div>
  );
}