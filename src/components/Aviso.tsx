import { AlertTriangle, X } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  tono?: "ok" | "error" | "info";
  children: ReactNode;
  onCerrar?: () => void;
}

export function Aviso({ tono = "info", children, onCerrar }: Props) {
  return (
    <div className={`aviso aviso--${tono}`} role="status">
      {tono === "error" && <AlertTriangle size={15} strokeWidth={2.2} />}
      <span>{children}</span>
      {onCerrar && (
        <button className="aviso__x" onClick={onCerrar} aria-label="Cerrar aviso">
          <X size={14} />
        </button>
      )}
    </div>
  );
}
