import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Download, Menu, Maximize, Minimize, Moon, MoreHorizontal, Plus, RotateCcw, Search, Sun, Upload, X } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

import { Aviso } from "./components/Aviso";
import { FabFoto } from "./components/FabFoto";
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
import { useEstadoRemoto, type Conexion } from "./hooks/useEstadoRemoto";
import { usePantallaCompleta } from "./hooks/usePantallaCompleta";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { useTema } from "./hooks/useTema";
import type { CfgImpresion, Pestana } from "./types";
import { ArchivadosView } from "./views/ArchivadosView";

const TEXTO_CONEXION: Record<Conexion, string> = {
  cargando: "Cargando…",
  guardando: "Guardando…",
  guardado: "Guardado en el servidor",
  error: "Sin conexión con el servidor",
};

export default function App() {
  const { est, setEst, reemplazar, conexion, error, recargar } = useEstadoRemoto();
  const { ocultar, activo, alternar } = usePantallaCompleta();
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
    setNavAbierta(false);
  }, []);

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
          {esMovil ? (
            <>
              <Button fuerte onClick={() => { setGuardando(true); void exportar().finally(() => setGuardando(false)); }} disabled={guardando}>
                {guardando ? <span className="btn__spinner" aria-hidden="true" /> : <Download size={15} />}
                {guardando ? "Guardando…" : "Guardar"}
              </Button>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <Button fino className="cabecera__mas" title="Más acciones" aria-label="Más acciones">
                    <MoreHorizontal size={16} />
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content className="menu" align="end" sideOffset={6}>
                  <DropdownMenu.Item className="menu__item" onSelect={() => tema.alternar()}>
                    {tema.tema === "dark" ? <Sun size={15} /> : <Moon size={15} />}
                    {tema.tema === "dark" ? "Tema claro" : "Tema oscuro"}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item className="menu__item" onSelect={() => { setGuardando(true); void restaurar().finally(() => setGuardando(false)); }}>
                    <RotateCcw size={15} /> Restaurar lista
                  </DropdownMenu.Item>
                  <DropdownMenu.Item className="menu__item" onSelect={alternar}>
                    {activo ? <Minimize size={15} /> : <Maximize size={15} />}
                    Pantalla completa
                  </DropdownMenu.Item>
                  <DropdownMenu.Item className="menu__item" onSelect={() => inputRef.current?.click()}>
                    <Upload size={15} /> Cargar otro Excel
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            </>
          ) : (
            <>
              <Button
                fino
                onClick={tema.alternar}
                title={tema.tema === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
              >
                {tema.tema === "dark" ? <Sun size={15} /> : <Moon size={15} />}
                {tema.tema === "dark" ? "Tema claro" : "Tema oscuro"}
              </Button>
              <Button fuerte onClick={() => { setGuardando(true); void exportar().finally(() => setGuardando(false)); }} disabled={guardando}>
                <Download size={15} /> {guardando ? "Guardando…" : "Guardar Excel"}
              </Button>
              <Button onClick={() => { setGuardando(true); void restaurar().finally(() => setGuardando(false)); }} disabled={guardando} title="Volver a la lista transcrita">
                <RotateCcw size={15} /> Restaurar lista
              </Button>
              <Button
                fino
                onClick={alternar}
                title={activo ? "Salir de pantalla completa" : "Pantalla completa: oculta el resumen y gana espacio"}
              >
                {activo ? <Minimize size={15} /> : <Maximize size={15} />}
                Pantalla completa
              </Button>
              <Button
                fino
                onClick={() => inputRef.current?.click()}
                title="Sustituir todo por el contenido de un Excel"
              >
                <Upload size={15} /> Cargar otro Excel
              </Button>
            </>
          )}
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

          {pestana !== "imprimir" && pestana !== "archivados" && (
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
            {pestana === "hermanos" && <TablaOrden est={est} setEst={setEst} filtro={filtro} />}
            {pestana === "cuotas" && <TablaCuotas est={est} setEst={setEst} filtro={filtro} />}
            {pestana === "asistencias" && (
              <TablaAsistencias est={est} setEst={setEst} filtro={filtro} />
            )}
            {pestana === "archivados" && <ArchivadosView est={est} setEst={setEst} />}
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
      </div>

      {pestana !== "imprimir" && <FabFoto onClick={() => setVolcadoFoto(true)} />}
    </div>
  );
}