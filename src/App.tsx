import { LogOut, Menu, Plus, RotateCcw, Search, X } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

import { Aviso } from "./components/Aviso";
import { FabFoto } from "./components/FabFoto";
import { Login } from "./components/Login";
import { PanelImpresion } from "./components/PanelImpresion";
import { Resumen } from "./components/Resumen";
import { Sidebar } from "./components/Sidebar";
import { TablaAsistencias } from "./components/TablaAsistencias";
import { TablaCuotas } from "./components/TablaCuotas";
import { TablaOrden } from "./components/TablaOrden";
import { Button } from "./components/ui/Button";
import { VolcadoFoto } from "./components/VolcadoFoto";
import { ANIO_BASE, ENTIDAD } from "./constants";
import { useAccionesApp } from "./hooks/useAccionesApp";
import { useAuth } from "./hooks/useAuth";
import { useEstadoRemoto, type Conexion } from "./hooks/useEstadoRemoto";
import { usePantallaCompleta } from "./hooks/usePantallaCompleta";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { useTema } from "./hooks/useTema";
import type { CfgImpresion, Pestana } from "./types";
import { ArchivadosView } from "./views/ArchivadosView";
import { ConfigView } from "./views/ConfigView";
import { EstadisticasView } from "./views/EstadisticasView";
import { ListaView } from "./views/ListaView";

const TEXTO_CONEXION: Record<Conexion, string> = {
  cargando: "Cargando…",
  guardando: "Guardando…",
  guardado: "Guardado en el servidor",
  error: "Sin conexión con el servidor",
};

export default function App() {
  const auth = useAuth();

  if (!auth.token) {
    return (
      <Login
        onLogin={auth.login}
        onLogout={auth.logout}
        username={auth.username}
        error={auth.error}
        cargando={auth.cargando}
      />
    );
  }

  return <AppAutenticado onLogout={auth.logout} />;
}

function AppAutenticado({ onLogout }: { onLogout: () => void }) {
  const { est, setEst, reemplazar, conexion, error, recargar } = useEstadoRemoto();
  const { ocultar, alternar } = usePantallaCompleta();
  const tema = useTema();

  const [pestana, setPestana] = useState<Pestana>("hermanos");
  const esMovil = useMediaQuery("(max-width: 760px)");
  const [navAbierta, setNavAbierta] = useState(() => !esMovil);
  const [filtro, setFiltro] = useState("");
  const [volcadoFoto, setVolcadoFoto] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [guardando, setGuardando] = useState(false);
  const [cfgImpr, setCfgImpr] = useState<CfgImpresion>({
    tipo: "asistencias",
    anioAnterior: ANIO_BASE,
    aniosNuevos: [ANIO_BASE + 1],
    blancos: 20,
    telefono: false,
    observaciones: false,
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

  const irA = useCallback((k: Pestana) => {
    setPestana(k);
    if (esMovil) setNavAbierta(false);
  }, [esMovil]);

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
          <Button
            fino
            onClick={() => setNavAbierta((v) => !v)}
            aria-label={navAbierta ? "Contraer el menú de secciones" : "Abrir el menú de secciones"}
            title="Menú de secciones"
          >
            <Menu size={16} />
          </Button>
          <Button fino onClick={onLogout} title="Cerrar sesión">
            <LogOut size={15} /> Salir
          </Button>
        </div>
      </header>

      <div className="app__cuerpo">
        <Sidebar actual={pestana} onIr={irA} abierta={navAbierta} onCerrar={() => setNavAbierta(false)} />
        <div className="app__central">
          {conexion === "error" && (
            <Aviso tono="error" onCerrar={recargar}>
              {error ?? "Sin conexión con el servidor."} Lo que cambies ahora se
              reintenta solo; no cierres la pestaña hasta que vuelva.
            </Aviso>
          )}

          {!ocultar && <Resumen est={est} />}

          {pestana !== "imprimir" && pestana !== "archivados" && pestana !== "lista" && pestana !== "configuracion" && pestana !== "estadisticas" && (
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
        {vacia && pestana !== "imprimir" && pestana !== "lista" && pestana !== "configuracion" && pestana !== "estadisticas" ? (
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
            {pestana === "hermanos" && <TablaOrden est={est} setEst={setEst} filtro={filtro} />}
            {pestana === "cuotas" && <TablaCuotas est={est} setEst={setEst} filtro={filtro} />}
            {pestana === "asistencias" && (
              <TablaAsistencias est={est} setEst={setEst} filtro={filtro} />
            )}
            {pestana === "archivados" && <ArchivadosView est={est} setEst={setEst} />}
            {pestana === "imprimir" && (
              <PanelImpresion est={est} cfg={cfgImpr} setCfg={setCfgImpr} />
            )}
            {pestana === "lista" && (
              <ListaView
                onExportar={() => { setGuardando(true); void exportar().finally(() => setGuardando(false)); }}
                onRestaurar={() => { setGuardando(true); void restaurar().finally(() => setGuardando(false)); }}
                onCargarExcel={() => inputRef.current?.click()}
                guardando={guardando}
              />
            )}
            {pestana === "configuracion" && (
              <ConfigView
                tema={tema.tema}
                onAlternarTema={tema.alternar}
                ocultar={ocultar}
                onAlternarPantalla={alternar}
              />
            )}
            {pestana === "estadisticas" && est && <EstadisticasView est={est} />}
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
      </div>

      {pestana !== "imprimir" && pestana !== "lista" && pestana !== "configuracion" && pestana !== "estadisticas" && (
        <FabFoto onClick={() => setVolcadoFoto(true)} />
      )}
    </div>
  );
}