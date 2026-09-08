import { Camera } from "lucide-react";

export function FabFoto({ onClick }: { onClick: () => void }) {
  return (
    <button className="volcado-fab" onClick={onClick} title="Leer asistencias o cuotas de la foto">
      <Camera size={24} />
    </button>
  );
}