import type * as XLSXTipos from "xlsx";

/**
 * SheetJS pesa unos 400 kB y solo se usa al importar o exportar, así que se
 * carga en el momento en lugar de en el arranque.
 */
let modulo: typeof XLSXTipos | null = null;
async function cargarXLSX(): Promise<typeof XLSXTipos> {
  if (!modulo) modulo = await import("xlsx");
  return modulo;
}

import {
  ANIO_BASE, BLOQUES, CUOTA_POR_DEFECTO, CUPO_POR_DEFECTO, ENTIDAD,
  ETIQUETA_BLOQUE, PROCESIONES,
} from "../constants";
import type { Cuota, Estado, Hermano, Marca } from "../types";
import {
  crearHermano, esAnio, esBloque, normalizarCuota, normalizarMarca,
  numerosPorBloque,
} from "./modelo";

type Fila = (string | number)[];

/* ================================================================= *
 * LECTURA
 * ================================================================= */

/** Fila (índice 0) que contiene la cabecera «Nombre completo». */
function buscarCabecera(filas: Fila[]): number {
  return filas.findIndex((f) =>
    f.some((c) => String(c).trim().toLowerCase() === "nombre completo")
  );
}

/** Índice de filas por bloque|número, para cruzar las tres hojas. */
function indexarPorNumero(filas: Fila[], desde: number): Map<string, Fila> {
  const m = new Map<string, Fila>();
  if (desde < 0) return m;
  for (let r = desde + 1; r < filas.length; r += 1) {
    const num = String(filas[r]?.[0] ?? "").trim();
    const nom = String(filas[r]?.[1] ?? "").trim();
    const bloque = String(filas[r]?.[2] ?? "").trim().toUpperCase();
    if (num && nom) m.set(`${bloque}|${num}`, filas[r]);
  }
  return m;
}

export async function leerLibro(datos: Uint8Array): Promise<Estado> {
  const XLSX = await cargarXLSX();
  const wb = XLSX.read(datos, { type: "array" });

  const hoja = (nombre: string) => {
    const n = wb.SheetNames.find((s) => s.toLowerCase() === nombre);
    return n ? wb.Sheets[n] : null;
  };
  const filasDe = (ws: XLSXTipos.WorkSheet | null): Fila[] =>
    ws ? (XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" }) as Fila[]) : [];

  const fH = filasDe(hoja("hermanos"));
  const fC = filasDe(hoja("cuotas"));
  const fA = filasDe(hoja("asistencias"));
  const fR = filasDe(hoja("resumen"));

  if (!fH.length) {
    throw new Error(
      "El fichero no tiene una hoja «Hermanos». Comprueba que es el libro de la agrupación."
    );
  }

  const iH = buscarCabecera(fH);
  if (iH < 0) throw new Error("No encuentro la cabecera «Nombre completo» en Hermanos.");

  /* cuotas: los años están en la propia fila de cabecera */
  const iC = buscarCabecera(fC);
  const colCuota = new Map<number, number>();
  if (iC >= 0) {
    fC[iC].forEach((c, idx) => {
      if (esAnio(c)) colCuota.set(Number(String(c).trim()), idx);
    });
  }

  /* asistencias: los años están en la fila de encima, en celdas combinadas */
  const iA = buscarCabecera(fA);
  const colAsis = new Map<number, number>();
  if (iA >= 0) {
    (fA[iA - 1] ?? []).forEach((c, idx) => {
      if (esAnio(c)) colAsis.set(Number(String(c).trim()), idx);
    });
    if (colAsis.size === 0) {
      /* respaldo: el año pegado al nombre de la procesión */
      fA[iA].forEach((c, idx) => {
        const m = String(c).match(/(19|20)\d{2}/);
        if (m && String(c).toLowerCase().includes("exalt")) {
          colAsis.set(Number(m[0]), idx);
        }
      });
    }
  }

  const porNumC = indexarPorNumero(fC, iC);
  const porNumA = indexarPorNumero(fA, iA);

  const hermanos: Hermano[] = [];
  for (let r = iH + 1; r < fH.length; r += 1) {
    const f = fH[r];
    const num = String(f?.[0] ?? "").trim();
    const nombre = String(f?.[1] ?? "").trim();
    if (!nombre) continue;
    const b = String(f?.[2] ?? "").trim().toUpperCase();

    const cuotas: Record<number, Cuota> = {};
    const fc = porNumC.get(`${b}|${num}`) ?? porNumC.get(num);
    if (fc) {
      colCuota.forEach((c, anio) => {
        const v = normalizarCuota(fc[c]);
        if (v) cuotas[anio] = v;
      });
    }

    const asis: Record<number, { exc: Marca; sm: Marca }> = {};
    const fa = porNumA.get(`${b}|${num}`) ?? porNumA.get(num);
    if (fa) {
      colAsis.forEach((c, anio) => {
        const exc = normalizarMarca(fa[c]);
        const sm = normalizarMarca(fa[c + 1]);
        if (exc || sm) asis[anio] = { exc, sm };
      });
    }

    hermanos.push(
      crearHermano({
        nombre,
        bloque: esBloque(b) ? b : "SUPLENTES",
        telefono: String(f?.[3] ?? "").trim(),
        notas: String(f?.[4] ?? "").trim(),
        cuotas,
        asis,
      })
    );
  }

  let cuota = CUOTA_POR_DEFECTO;
  fR.forEach((f) => {
    const et = String(f?.[0] ?? "").toLowerCase();
    const v = Number(String(f?.[1] ?? "").replace(",", "."));
    if (!Number.isFinite(v) || v <= 0) return;
    if (et.includes("cuota")) cuota = v;
  });

  const aniosCuotas = [...colCuota.keys()].sort((a, b) => a - b);
  const aniosAsis = [...colAsis.keys()].sort((a, b) => a - b);

  return {
    cupo: CUPO_POR_DEFECTO,
    cuota,
    aniosCuotas: aniosCuotas.length ? aniosCuotas : [ANIO_BASE],
    aniosAsis: aniosAsis.length ? aniosAsis : [ANIO_BASE],
    hermanos,
    archivados: [],
  };
}

/* ================================================================= *
 * ESCRITURA
 * ================================================================= */

function escribirLibro(
  XLSX: typeof XLSXTipos,
  est: Estado
): XLSXTipos.WorkBook {
  const { hermanos, aniosCuotas, aniosAsis, cupo, cuota } = est;
  const n = hermanos.length;
  const numeros = numerosPorBloque(hermanos);
  const col = (i: number) => XLSX.utils.encode_col(i);

  /* --- Hermanos --------------------------------------------------- */
  const wsH = XLSX.utils.aoa_to_sheet([
    [`${ENTIDAD} — Listado de hermanos`],
    ["Esta hoja es la lista buena: el puesto lo da el orden de las filas."],
    ["Nº", "Nombre completo", "Bloque", "Teléfono", "Observaciones"],
    ...hermanos.map((h, i) => [numeros[i], h.nombre, h.bloque, h.telefono, h.notas]),
  ]);
  wsH["!cols"] = [{ wch: 6 }, { wch: 36 }, { wch: 13 }, { wch: 14 }, { wch: 40 }];
  wsH["!freeze"] = { xSplit: "0", ySplit: "3" };

  /* --- Cuotas ----------------------------------------------------- */
  const wsC = XLSX.utils.aoa_to_sheet([
    [`${ENTIDAD} — Cuotas`],
    [`Cuota anual de ${cuota} €. S = pagada, N = pendiente.`],
    [],
    ["Nº", "Nombre completo", "Bloque", ...aniosCuotas.map(String),
      "Años pagados", "Pagado (€)", "Pendiente (€)"],
    ...hermanos.map((h, i) => [
      numeros[i], h.nombre, h.bloque,
      ...aniosCuotas.map((a) => h.cuotas?.[a] ?? ""),
      "", "", "",
    ]),
  ]);
  const c0 = 3;
  const cN = c0 + aniosCuotas.length - 1;
  for (let i = 0; i < n; i += 1) {
    const fila = 5 + i;
    const rango = `${col(c0)}${fila}:${col(cN)}${fila}`;
    wsC[`${col(cN + 1)}${fila}`] = { t: "n", f: `COUNTIF(${rango},"S")` };
    wsC[`${col(cN + 2)}${fila}`] = {
      t: "n", f: `${col(cN + 1)}${fila}*${cuota}`, z: '#,##0 "€"',
    };
    wsC[`${col(cN + 3)}${fila}`] = {
      t: "n",
      f: `(${aniosCuotas.length}-${col(cN + 1)}${fila})*${cuota}`,
      z: '#,##0 "€"',
    };
  }
  wsC["!ref"] = `A1:${col(cN + 3)}${4 + n}`;
  wsC["!cols"] = [
    { wch: 6 }, { wch: 36 }, { wch: 13 },
    ...aniosCuotas.map(() => ({ wch: 10 })),
    { wch: 13 }, { wch: 12 }, { wch: 13 },
  ];
  wsC["!freeze"] = { xSplit: "3", ySplit: "4" };

  /* --- Asistencias ------------------------------------------------ */
  const filaAnios: Fila = ["", "", ""];
  const cabA: Fila = ["Nº", "Nombre completo", "Bloque"];
  aniosAsis.forEach((a) => {
    filaAnios.push(String(a), "");
    cabA.push(PROCESIONES[0].largo, PROCESIONES[1].largo);
  });
  cabA.push("Asistencias", "Faltas", "Justificadas", "% asistencia");

  const wsA = XLSX.utils.aoa_to_sheet([
    [`${ENTIDAD} — Asistencia a las procesiones`],
    ["V = asistió · F = falta · FJ = falta justificada · vacío = no se sabe"],
    filaAnios,
    cabA,
    ...hermanos.map((h, i) => {
      const f: Fila = [numeros[i], h.nombre, h.bloque];
      aniosAsis.forEach((a) => {
        f.push(h.asis?.[a]?.exc ?? "", h.asis?.[a]?.sm ?? "");
      });
      f.push("", "", "", "");
      return f;
    }),
  ]);
  const a0 = 3;
  const aN = a0 + aniosAsis.length * 2 - 1;
  wsA["!merges"] = aniosAsis.map((_, k) => ({
    s: { r: 2, c: a0 + k * 2 },
    e: { r: 2, c: a0 + k * 2 + 1 },
  }));
  for (let i = 0; i < n; i += 1) {
    const fila = 5 + i;
    const rango = `${col(a0)}${fila}:${col(aN)}${fila}`;
    wsA[`${col(aN + 1)}${fila}`] = { t: "n", f: `COUNTIF(${rango},"V")` };
    wsA[`${col(aN + 2)}${fila}`] = { t: "n", f: `COUNTIF(${rango},"F")` };
    wsA[`${col(aN + 3)}${fila}`] = { t: "n", f: `COUNTIF(${rango},"FJ")` };
    wsA[`${col(aN + 4)}${fila}`] = {
      t: "n",
      f: `IF(COUNTA(${rango})=0,"",${col(aN + 1)}${fila}/COUNTA(${rango}))`,
      z: "0%",
    };
  }
  wsA["!ref"] = `A1:${col(aN + 4)}${4 + n}`;
  wsA["!cols"] = [
    { wch: 6 }, { wch: 36 }, { wch: 13 },
    ...aniosAsis.flatMap(() => [{ wch: 13 }, { wch: 13 }]),
    { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 13 },
  ];
  wsA["!freeze"] = { xSplit: "3", ySplit: "4" };

  /* --- Resumen ---------------------------------------------------- */
  const anios = [...new Set([...aniosCuotas, ...aniosAsis])].sort((a, b) => a - b);
  const wsR = XLSX.utils.aoa_to_sheet([
    [ENTIDAD],
    ["Cifras del momento en que se descargó el libro."],
    ["Cupo (puestos que procesionan)", cupo],
    ["Cuota anual (€)", cuota],
    [],
    ["Total en la lista", n],
    ...BLOQUES.map((b) => [
      ETIQUETA_BLOQUE[b],
      hermanos.filter((h) => h.bloque === b).length,
    ]),
    [],
    ["Año", "Cuotas pagadas", "Recaudado (€)", "Asist. Exaltación", "Asist. San Martín"],
    ...anios.map((a) => {
      const pag = hermanos.filter((h) => h.cuotas?.[a] === "S").length;
      return [
        a,
        pag,
        pag * cuota,
        hermanos.filter((h) => h.asis?.[a]?.exc === "V").length,
        hermanos.filter((h) => h.asis?.[a]?.sm === "V").length,
      ];
    }),
  ]);
  wsR["!cols"] = [{ wch: 34 }, { wch: 17 }, { wch: 16 }, { wch: 18 }, { wch: 18 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsR, "Resumen");
  XLSX.utils.book_append_sheet(wb, wsH, "Hermanos");
  XLSX.utils.book_append_sheet(wb, wsC, "Cuotas");
  XLSX.utils.book_append_sheet(wb, wsA, "Asistencias");
  return wb;
}

export async function descargarLibro(est: Estado): Promise<void> {
  const XLSX = await cargarXLSX();
  const wb = escribirLibro(XLSX, est);
  const fecha = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `braceros-san-martin-${fecha}.xlsx`);
}
