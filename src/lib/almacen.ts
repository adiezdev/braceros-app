/**
 * Guarda el estado entre visitas. Usa window.storage si existe (entorno de
 * artefactos) y localStorage en cualquier otro sitio. Si falla, no pasa nada:
 * el Excel descargado sigue siendo la copia buena.
 */
export const almacen = {
  async leer<T>(clave: string): Promise<T | null> {
    try {
      if (window.storage) {
        const r = await window.storage.get(clave);
        return r ? (JSON.parse(r.value) as T) : null;
      }
      const v = window.localStorage.getItem(clave);
      return v ? (JSON.parse(v) as T) : null;
    } catch {
      return null;
    }
  },

  async escribir(clave: string, valor: unknown): Promise<void> {
    try {
      const s = JSON.stringify(valor);
      if (window.storage) await window.storage.set(clave, s);
      else window.localStorage.setItem(clave, s);
    } catch {
      /* sin persistencia */
    }
  },
};
