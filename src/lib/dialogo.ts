import { useEffect, useState } from "react";

/* ------------------------------------------------------------------ *
 * Diálogos propios (confirmar / preguntar / avisar) en lugar de los
 * alert/confirm/prompt nativos del navegador. Un store singleton
 * encola los diálogos; el componente <Dialogo/> montado en main.tsx
 * se suscribe y los pinta como modal.
 * ------------------------------------------------------------------ */

export type Dialogo =
  | { tipo: "confirmar" | "avisar"; mensaje: string; resolver: (valor: boolean) => void }
  | { tipo: "preguntar"; mensaje: string; sugerido: string; resolver: (valor: string | null) => void };

let cola: Dialogo[] = [];
const suscriptores = new Set<() => void>();

function emitir() {
  for (const fn of suscriptores) fn();
}

function cerrarActual(): Dialogo | null {
  const d = cola[0];
  cola = cola.slice(1);
  return d ?? null;
}

function encolar(tipo: Dialogo["tipo"], mensaje: string, sugerido: string) {
  return new Promise<boolean | string | null>((resolve) => {
    const d: Dialogo = {
      tipo,
      mensaje,
      ...(tipo === "preguntar" ? { sugerido } : {}),
      resolver: (valor: boolean | string | null) => {
        cerrarActual();
        resolve(valor);
        emitir();
      },
    } as Dialogo;
    cola = [...cola, d];
    emitir();
  });
}

export function confirmar(mensaje: string): Promise<boolean> {
  return encolar("confirmar", mensaje, "") as Promise<boolean>;
}

export function avisar(mensaje: string): Promise<void> {
  return encolar("avisar", mensaje, "") as Promise<unknown> as Promise<void>;
}

export function preguntar(mensaje: string, sugerido: string): Promise<string | null> {
  return encolar("preguntar", mensaje, sugerido) as Promise<string | null>;
}

export function useDialogo(): Dialogo | null {
  const [actual, setActual] = useState<Dialogo | null>(cola[0] ?? null);

  useEffect(() => {
    const fn = () => setActual(cola[0] ?? null);
    suscriptores.add(fn);
    fn();
    return () => {
      suscriptores.delete(fn);
    };
  }, []);

  return actual;
}
