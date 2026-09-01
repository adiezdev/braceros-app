const BASE = "http://localhost:8087/api";
let fallos = 0;

const post = async (ops) => {
  const r = await fetch(`${BASE}/cambios`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ops }),
  });
  const cuerpo = await r.json();
  if (!r.ok) throw new Error(`${r.status} ${JSON.stringify(cuerpo)}`);
  return cuerpo;
};
const leer = async () => (await (await fetch(`${BASE}/estado`)).json());

const comprobar = (nombre, real, esperado) => {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) fallos++;
  console.log(`${ok ? "OK  " : "FALLA"} ${nombre}${ok ? "" : `\n      esperado ${JSON.stringify(esperado)}\n      real     ${JSON.stringify(real)}`}`);
};

// 1. reemplazar: es lo que hace "Restaurar lista" y "Cargar Excel"
await post([{
  tipo: "reemplazar",
  estado: {
    cupo: 73, cuota: 10,
    aniosCuotas: [2026], aniosAsis: [2026],
    hermanos: [
      { id: "a", nombre: "Ana",  bloque: "HONORARIOS", telefono: "1", notas: "", cuotas: { 2026: "S" }, asis: { 2026: { exc: "V", sm: "" } } },
      { id: "b", nombre: "Bea",  bloque: "TITULARES",  telefono: "2", notas: "", cuotas: {},            asis: {} },
      { id: "c", nombre: "Caro", bloque: "SUPLENTES",  telefono: "3", notas: "", cuotas: { 2026: "N" }, asis: { 2026: { exc: "FJ", sm: "F" } } },
    ],
  },
}]);

let e = (await leer()).estado;
comprobar("reemplazar: orden y nombres", e.hermanos.map((h) => h.nombre), ["Ana", "Bea", "Caro"]);
comprobar("reemplazar: cuota de Ana", e.hermanos[0].cuotas, { 2026: "S" });
comprobar("reemplazar: asistencia de Caro", e.hermanos[2].asis, { 2026: { exc: "FJ", sm: "F" } });
comprobar("reemplazar: vacio no se guarda", e.hermanos[1].cuotas, {});
comprobar("reemplazar: anios", [e.aniosCuotas, e.aniosAsis], [[2026], [2026]]);

// 2. operaciones granulares, que es el camino normal al usar la app
const { version: v1 } = await post([
  { tipo: "hermano.campos", id: "b", nombre: "Beatriz" },
  { tipo: "cuota", hermanoId: "b", anio: 2026, estado: "S" },
  { tipo: "asistencia", hermanoId: "b", anio: 2026, procesion: "sm", marca: "V" },
  { tipo: "cuota", hermanoId: "a", anio: 2026, estado: "" },
  { tipo: "hermano.orden", ids: ["c", "a", "b"] },
]);

e = (await leer()).estado;
comprobar("campos: solo cambia el nombre", [e.hermanos.find(h=>h.id==="b").nombre, e.hermanos.find(h=>h.id==="b").telefono], ["Beatriz", "2"]);
comprobar("cuota nueva de Beatriz", e.hermanos.find(h=>h.id==="b").cuotas, { 2026: "S" });
comprobar("asistencia nueva de Beatriz", e.hermanos.find(h=>h.id==="b").asis, { 2026: { exc: "", sm: "V" } });
comprobar("cuota vacia borra la fila", e.hermanos.find(h=>h.id==="a").cuotas, {});
comprobar("reordenar", e.hermanos.map((h) => h.id), ["c", "a", "b"]);

// 3. alta, baja y año nuevo
await post([
  { tipo: "anio.alta", cual: "cuotas", anio: 2027 },
  { tipo: "hermano.alta", id: "d", nombre: "Diego", bloque: "SUPLENTES", telefono: "", notas: "nuevo" },
  { tipo: "hermano.orden", ids: ["c", "a", "b", "d"] },
  { tipo: "cuota", hermanoId: "d", anio: 2027, estado: "N" },
  { tipo: "hermano.baja", id: "a" },
]);

e = (await leer()).estado;
comprobar("alta y baja", e.hermanos.map((h) => h.nombre), ["Caro", "Beatriz", "Diego"]);
comprobar("anio nuevo", e.aniosCuotas, [2026, 2027]);
comprobar("cuota en el anio nuevo", e.hermanos[2].cuotas, { 2027: "N" });

// 4. quitar un año se lleva sus marcas por cascada
await post([{ tipo: "anio.baja", cual: "cuotas", anio: 2027 }]);
e = (await leer()).estado;
comprobar("baja de anio: la columna se va", e.aniosCuotas, [2026]);
comprobar("baja de anio: sus marcas tambien", e.hermanos[2].cuotas, {});

// 5. la version avanza con cada cambio (es lo que sondean los navegadores)
const { version: v2 } = await post([{ tipo: "ajustes", cupo: 70, cuota: 12 }]);
comprobar("la version avanza", v2 > v1, true);
e = (await leer()).estado;
comprobar("ajustes", [e.cupo, e.cuota], [70, 12]);

// 6. rechazo de basura
for (const [nombre, op] of [
  ["bloque invalido", { tipo: "hermano.campos", id: "b", bloque: "OBISPOS" }],
  ["marca invalida",  { tipo: "asistencia", hermanoId: "b", anio: 2026, procesion: "sm", marca: "Z" }],
  ["anio imposible",  { tipo: "cuota", hermanoId: "b", anio: 99999, estado: "S" }],
  ["tipo inventado",  { tipo: "hermano.teletransportar", id: "b" }],
]) {
  const r = await fetch(`${BASE}/cambios`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ops: [op] }),
  });
  comprobar(`rechaza ${nombre} (400)`, r.status, 400);
}

// 7. y que un rechazo no deje nada a medias
const antes = (await leer()).estado;
await fetch(`${BASE}/cambios`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ ops: [
    { tipo: "hermano.campos", id: "b", nombre: "NO DEBE QUEDAR" },
    { tipo: "hermano.campos", id: "b", bloque: "OBISPOS" },
  ] }),
});
const despues = (await leer()).estado;
comprobar("transaccion: un fallo revierte el lote", despues.hermanos.map(h=>h.nombre), antes.hermanos.map(h=>h.nombre));

console.log(fallos ? `\n${fallos} comprobaciones fallan` : "\nTodo correcto");
process.exit(fallos ? 1 : 0);
