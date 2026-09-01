import { diferencias } from "../src/lib/diff";
import type { Estado, Hermano } from "../src/types";

// ESTO BORRA LA BASE ENTERA. El cerrojo está para que apuntar esto al NAS
// "solo para probar una cosa" no se lleve por delante la lista de verdad.
const BASE = process.env.API ?? "http://localhost:8087/api";
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(BASE)) {
  console.error(`Estas pruebas borran todos los datos. Solo contra la pila local, y ${BASE} no lo es.`);
  process.exit(1);
}

let fallos = 0;

const h = (id: string, p: Partial<Hermano> = {}): Hermano => ({
  id, nombre: id.toUpperCase(), bloque: "TITULARES", telefono: "", notas: "",
  cuotas: {}, asis: {}, ...p,
});

const est = (p: Partial<Estado> = {}): Estado => ({
  cupo: 73, cuota: 10, aniosCuotas: [2025], aniosAsis: [2025], hermanos: [], ...p,
});

const post = async (ops: unknown[]) => {
  const r = await fetch(`${BASE}/cambios`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ops }),
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
};
const leer = async (): Promise<Estado> =>
  (await (await fetch(`${BASE}/estado`)).json()).estado;

/**
 * La base no guarda los vacÃ­os (no hay fila), y devuelve el par de
 * asistencias siempre completo. Se normaliza lo esperado igual para poder
 * comparar sin ruido.
 */
const normalizar = (e: Estado): Estado => ({
  ...e,
  hermanos: e.hermanos.map((x) => {
    const cuotas: Hermano["cuotas"] = {};
    for (const [a, v] of Object.entries(x.cuotas)) if (v) cuotas[Number(a)] = v;
    const asis: Hermano["asis"] = {};
    for (const [a, v] of Object.entries(x.asis)) {
      if (v?.exc || v?.sm) asis[Number(a)] = { exc: v.exc || "", sm: v.sm || "" };
    }
    return { ...x, cuotas, asis };
  }),
});

/** Deja la base en "antes", aplica el diff hacia "despues", y compara. */
async function caso(nombre: string, antes: Estado, despues: Estado) {
  await post([{ tipo: "reemplazar", estado: antes }]);
  const ops = diferencias(antes, despues);
  if (ops.length) await post(ops);

  const real = normalizar(await leer());
  const esperado = normalizar(despues);
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) fallos++;
  console.log(
    `${ok ? "OK  " : "FALLA"} ${nombre}  (${ops.length} ops: ${ops.map((o) => o.tipo).join(", ") || "ninguna"})` +
      (ok ? "" : `\n      esperado ${JSON.stringify(esperado)}\n      real     ${JSON.stringify(real)}`)
  );
}

const tres = est({ hermanos: [h("a"), h("b"), h("c")] });

await caso("sin cambios no manda nada", tres, tres);

await caso("cambiar un nombre", tres,
  { ...tres, hermanos: [h("a", { nombre: "Agapito" }), h("b"), h("c")] });

await caso("cambiar bloque y telefono a la vez", tres,
  { ...tres, hermanos: [h("a", { bloque: "HONORARIOS", telefono: "600" }), h("b"), h("c")] });

await caso("marcar una cuota", tres,
  { ...tres, hermanos: [h("a", { cuotas: { 2025: "S" } }), h("b"), h("c")] });

await caso("marcar las dos procesiones", tres,
  { ...tres, hermanos: [h("a", { asis: { 2025: { exc: "V", sm: "FJ" } } }), h("b"), h("c")] });

await caso("desmarcar (volver a vacio)",
  est({ hermanos: [h("a", { cuotas: { 2025: "S" }, asis: { 2025: { exc: "V", sm: "V" } } }), h("b")] }),
  est({ hermanos: [h("a", { cuotas: { 2025: "" }, asis: { 2025: { exc: "", sm: "V" } } }), h("b")] }));

await caso("subir uno de puesto", tres,
  { ...tres, hermanos: [h("b"), h("a"), h("c")] });

await caso("dar de alta al final", tres,
  { ...tres, hermanos: [h("a"), h("b"), h("c"), h("d")] });

await caso("borrar el del medio", tres,
  { ...tres, hermanos: [h("a"), h("c")] });

await caso("borrar y reordenar de golpe", tres,
  { ...tres, hermanos: [h("c"), h("a")] });

await caso("anadir un anio", tres,
  { ...tres, aniosCuotas: [2025, 2026] });

await caso("quitar un anio se lleva sus marcas",
  est({ aniosCuotas: [2025, 2026], hermanos: [h("a", { cuotas: { 2025: "S", 2026: "N" } })] }),
  est({ aniosCuotas: [2025], hermanos: [h("a", { cuotas: { 2025: "S" } })] }));

await caso("cambiar cupo y cuota", tres, { ...tres, cupo: 70, cuota: 12 });

// Un Excel entero: el diff debe rendirse y mandar un reemplazar
const muchos = est({ hermanos: Array.from({ length: 140 }, (_, i) => h(`n${i}`)) });
const ops = diferencias(tres, muchos);
const esReemplazo = !ops.some((o) => o.tipo === "reemplazar");
if (!esReemplazo) fallos++;
console.log(`${esReemplazo ? "OK  " : "FALLA"} un cambio masivo NO escala a reemplazar (${ops.length} ops)`);
await caso("y ese reemplazo deja la lista correcta", tres, muchos);

console.log(fallos ? `\n${fallos} comprobaciones fallan` : "\nTodo correcto");
process.exit(fallos ? 1 : 0);


