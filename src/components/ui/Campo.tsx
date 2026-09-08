import type { ReactNode } from "react";

/** Etiqueta con su control debajo (uso en paneles de configuración). */
export function Campo({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <label className="campo">
      <span>{etiqueta}</span>
      {children}
    </label>
  );
}