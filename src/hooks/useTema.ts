import { useCallback, useEffect, useState } from "react";

export type Tema = "light" | "dark";

function inicial(): Tema {
  const guardado = document.documentElement.getAttribute("data-theme");
  return guardado === "dark" || guardado === "light" ? guardado : "light";
}

export function useTema() {
  const [tema, setTema] = useState<Tema>(inicial);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", tema);
    try {
      localStorage.setItem("tema", tema);
    } catch {
      /* sin acceso a storage: no persiste, pero el tema sí se aplica */
    }
  }, [tema]);

  const alternar = useCallback(
    () => setTema((t) => (t === "dark" ? "light" : "dark")),
    []
  );

  return { tema, alternar };
}
