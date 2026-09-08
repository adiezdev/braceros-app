import { X } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

export function IconButton({
  tono = "volcado",
  etiqueta,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  /** variante de color según dónde aparezca el botón */
  tono?: "volcado" | "bulk";
  etiqueta?: string;
}) {
  const clases = ["icon-btn", `icon-btn--${tono}`, className].filter(Boolean).join(" ");
  return (
    <button className={clases} {...rest}>
      <X size={16} />
      {etiqueta}
    </button>
  );
}