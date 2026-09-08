import { useCallback, useEffect, useState } from "react";

const CLAVE = "braceros-ocultar-resumen";

type DocumentoFullscreen = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => void;
};

type ElementoFullscreen = HTMLElement & {
  webkitRequestFullscreen?: () => void;
};

/** En macOS no abrimos el fullscreen del sistema; solo ocultamos el resumen. */
function esMac(): boolean {
  const ua = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
  const plataforma = ua?.platform ?? navigator.platform;
  return /mac/i.test(plataforma);
}

function enPantallaCompleta(): boolean {
  const doc = document as DocumentoFullscreen;
  return Boolean(document.fullscreenElement ?? doc.webkitFullscreenElement);
}

function salirPantallaCompleta() {
  const doc = document as DocumentoFullscreen;
  if (document.exitFullscreen) void document.exitFullscreen();
  else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
}

/**
 * Botón de pantalla completa: al activarlo oculta el Resumen (cifra + bloques)
 * para ganar altura en pantallas pequeñas. En macOS solo se oculta el resumen
 * sin abrir el fullscreen del sistema (cambia el espacio de trabajo); en el
 * resto de plataformas además entra en fullscreen. La preferencia se guarda en
 * localStorage y se restaura al volver.
 */
export function usePantallaCompleta() {
  const [ocultar, setOcultar] = useState<boolean>(() => {
    try {
      return localStorage.getItem(CLAVE) === "1";
    } catch {
      return false;
    }
  });

  const [activo, setActivo] = useState<boolean>(() => enPantallaCompleta());

  // Sincroniza con el navegador (Esc/gestos salen del fullscreen).
  useEffect(() => {
    if (esMac()) return;
    const alCambiar = () => setActivo(enPantallaCompleta());
    document.addEventListener("fullscreenchange", alCambiar);
    document.addEventListener("webkitfullscreenchange", alCambiar);
    return () => {
      document.removeEventListener("fullscreenchange", alCambiar);
      document.removeEventListener("webkitfullscreenchange", alCambiar);
    };
  }, []);

  const alternar = useCallback(() => {
    const mac = esMac();
    const en = enPantallaCompleta();
    if (en && !mac) {
      salirPantallaCompleta();
      setOcultar(false);
      setActivo(false);
      try {
        localStorage.setItem(CLAVE, "0");
      } catch {
        /* sin almacenamiento no pasa nada */
      }
    } else {
      if (!mac) {
        const el = document.documentElement as ElementoFullscreen;
        if (document.documentElement.requestFullscreen) {
          void document.documentElement.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          el.webkitRequestFullscreen();
        }
      }
      const ocultarAhora = !ocultar;
      setOcultar(ocultarAhora);
      setActivo(ocultarAhora);
      try {
        localStorage.setItem(CLAVE, ocultarAhora ? "1" : "0");
      } catch {
        /* sin almacenamiento no pasa nada */
      }
    }
  }, [ocultar]);

  return { ocultar, activo, alternar };
}
