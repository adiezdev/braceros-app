import { Camera } from "lucide-react";
import { motion } from "motion/react";

export function FabFoto({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      className="volcado-fab"
      onClick={onClick}
      title="Leer asistencias o cuotas de la foto"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.4 }}
      whileTap={{ scale: 0.9 }}
    >
      <Camera size={24} />
    </motion.button>
  );
}
