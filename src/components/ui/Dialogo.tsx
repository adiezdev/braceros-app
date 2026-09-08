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
  return (
    <div className="dialogo__capas">
      <div className="dialogo__fondo" />
      <div role="dialog" aria-modal="true" className="dialogo" tabIndex={-1}>
        <p className="dialogo__mensaje">{dialogo.mensaje}</p>
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
      </div>
    </div>
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
    <div className="dialogo__capas">
      <div className="dialogo__fondo" />
      <div role="dialog" aria-modal="true" className="dialogo" tabIndex={-1}>
        <p className="dialogo__mensaje">{dialogo.mensaje}</p>
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
      </div>
    </div>
  );
}
