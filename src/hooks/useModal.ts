import { useEffect, useRef, type RefObject } from "react";

export function useLockBodyScroll(activo: boolean) {
  useEffect(() => {
    if (!activo) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [activo]);
}

export function useFocusTrap(ref: RefObject<HTMLElement | null>, activo: boolean, autoFocusPrimero = false) {
  useEffect(() => {
    const el = ref.current;
    if (!activo || !el) return;
    const focusables = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const primero = focusables[0];
    const ultimo = focusables[focusables.length - 1];
    if (autoFocusPrimero) primero?.focus();

    const trapar = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === primero) { e.preventDefault(); ultimo?.focus(); }
      } else {
        if (document.activeElement === ultimo) { e.preventDefault(); primero?.focus(); }
      }
    };
    el.addEventListener("keydown", trapar);
    return () => el.removeEventListener("keydown", trapar);
  }, [ref, activo, autoFocusPrimero]);
}

export function useRestoreFocus(activo: boolean) {
  const prevRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!activo) return;
    prevRef.current = document.activeElement as HTMLElement;
    return () => prevRef.current?.focus();
  }, [activo]);
}

export function useModal(abierto: boolean, ref: RefObject<HTMLElement | null>, autoFocusPrimero = false) {
  useLockBodyScroll(abierto);
  useRestoreFocus(abierto);
  useFocusTrap(ref, abierto, autoFocusPrimero);
}
