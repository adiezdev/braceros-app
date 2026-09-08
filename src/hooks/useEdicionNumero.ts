import { useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import { contarBloque, moverANumero, numerosPorBloque } from "../lib/modelo";
import type { Estado } from "../types";

export interface EdicionNumero {
  editandoId: string | null;
  borrador: string;
  setBorrador: (v: string) => void;
  rango: [number, number];
  pista: string;
  abrir: (indice: number) => void;
  confirmar: (id: string) => void;
  enEnter: () => void;
  enEscape: () => void;
}

/**
 * Edición en línea del Nº impreso: pulsar el número abre un campo que, al
 * soltar, reordena al hermano a la posición pedida (moverANumero fija el
 * bloque según la línea del cupo).
 */
export function useEdicionNumero(
  est: Estado,
  setEst: Dispatch<SetStateAction<Estado>>,
): EdicionNumero {
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [borrador, setBorrador] = useState("");
  const [rango, setRango] = useState<[number, number]>([1, 0]);
  const [pista, setPista] = useState("");
  const cancelarRef = useRef(false);

  const abrir = (indice: number) => {
    const hermano = est.hermanos[indice];
    if (!hermano) return;
    const numeros = numerosPorBloque(est.hermanos);
    const nHon = contarBloque(est.hermanos, "HONORARIOS");
    const nTotal = est.hermanos.length - nHon;
    const esHonorario = hermano.bloque === "HONORARIOS";
    const rango: [number, number] = esHonorario ? [1, nHon] : [1, nTotal];
    const linea = est.cupo - nHon;
    setEditandoId(hermano.id);
    setBorrador(String(numeros[indice]));
    setRango(rango);
    setPista(
      esHonorario
        ? `Nº de honorario: entre 1 y ${nHon}`
        : `Puesto 1..${nTotal}: hasta ${linea} titular, de ${linea + 1} en adelante suplente`,
    );
  };

  const confirmar = (id: string) => {
    if (cancelarRef.current) {
      cancelarRef.current = false;
      setEditandoId(null);
      setBorrador("");
      return;
    }
    const numero = Number(borrador);
    if (Number.isInteger(numero) && numero >= rango[0] && numero <= rango[1]) {
      setEst((p) => ({ ...p, hermanos: moverANumero(p.hermanos, id, numero, p.cupo) }));
    }
    setEditandoId(null);
    setBorrador("");
  };

  const enEnter = () => {
    cancelarRef.current = false;
  };

  const enEscape = () => {
    cancelarRef.current = true;
  };

  return { editandoId, borrador, setBorrador, rango, pista, abrir, confirmar, enEnter, enEscape };
}