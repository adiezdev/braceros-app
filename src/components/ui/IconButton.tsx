import { X } from "lucide-react";
import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export const IconButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & {
  /** variante de color según dónde aparezca el botón */
  tono?: "volcado" | "bulk" | "fila";
  etiqueta?: string;
  children?: ReactNode;
}>(function IconButton(
  { tono = "volcado", etiqueta, className = "", children, ...rest },
  ref,
) {
  const clases = ["icon-btn", `icon-btn--${tono}`, className].filter(Boolean).join(" ");
  return (
    <button ref={ref} className={clases} aria-label={etiqueta} {...rest}>
      {children ?? <X size={16} />}
      {etiqueta}
    </button>
  );
});