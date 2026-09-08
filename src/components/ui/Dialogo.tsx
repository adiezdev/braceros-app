import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { useDialogo, type Dialogo } from "../../lib/dialogo";
import { Button } from "./Button";

/** Modal genérico que sustituye a confirm/alert del navegador. */
export function Dialogo() {
  const dialogo = useDialogo();

  if (!dialogo) return null;

  if (dialogo.tipo === "preguntar") {
    return <Preguntar dialogo={dialogo} />;
  }
  return <Confirmar dialogo={dialogo} />;
}

function Confirmar({ dialogo }: { dialogo: Dialogo & { tipo: "confirmar" | "avisar" } }) {
  const esConfirmar = dialogo.tipo === "confirmar";
  const cerrar = () => dialogo.resolver(esConfirmar ? false : true);

  return (
    <Dialog.Root open onOpenChange={(abierto) => { if (!abierto) cerrar(); }}>
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <motion.div
            className="dialogo__capas"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="dialogo__fondo" onClick={cerrar} />
            <Dialog.Content asChild>
              <motion.div
                className="dialogo"
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <Dialog.Title asChild>
                  <p className="dialogo__mensaje">{dialogo.mensaje}</p>
                </Dialog.Title>
                <div className="dialogo__acciones">
                  {esConfirmar && (
                    <Button fino onClick={() => dialogo.resolver(false)}>
                      Cancelar
                    </Button>
                  )}
                  <Button fuerte fino onClick={() => dialogo.resolver(true)} autoFocus>
                    {esConfirmar ? "Sí" : "Aceptar"}
                  </Button>
                </div>
              </motion.div>
            </Dialog.Content>
          </motion.div>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Preguntar({ dialogo }: { dialogo: Dialogo & { tipo: "preguntar" } }) {
  const [valor, setValor] = useState(dialogo.sugerido);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const enviar = () => dialogo.resolver(valor);

  return (
    <Dialog.Root open onOpenChange={(abierto) => { if (!abierto) dialogo.resolver(null); }}>
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <motion.div
            className="dialogo__capas"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="dialogo__fondo" />
            <Dialog.Content asChild>
              <motion.div
                className="dialogo"
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <Dialog.Title asChild>
                  <p className="dialogo__mensaje">{dialogo.mensaje}</p>
                </Dialog.Title>
                <input
                  ref={ref}
                  className="txt"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") enviar();
                    if (e.key === "Escape") dialogo.resolver(null);
                  }}
                />
                <div className="dialogo__acciones">
                  <Button fino onClick={() => dialogo.resolver(null)}>
                    Cancelar
                  </Button>
                  <Button fuerte fino onClick={enviar}>
                    Añadir
                  </Button>
                </div>
              </motion.div>
            </Dialog.Content>
          </motion.div>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
