import { alinear, normalizarNombre, type Alineable } from "../src/lib/alinear";

let fallos = 0;

function comprobar(nombre: string, ok: boolean): void {
  if (!ok) {
    fallos += 1;
    console.error(`  ✗ ${nombre}`);
  } else {
    console.log(`  ✓ ${nombre}`);
  }
}

const lista: Alineable[] = [
  { id: "a", n: 1, nombre: "Pérez García, Juan" },
  { id: "b", n: 2, nombre: "Motos, Carlos" },
  { id: "c", n: 3, nombre: "San Román, Ana" },
];

// Hoja de un año anterior: Juan mantiene su nombre, Carlos ahora va el 2º,
// "Reyes, Luis" ya no está en la lista actual.
const res = alinear(
  [
    { n: 1, nombre: "Pérez García, JUAN", marcas: ["V"] },
    { n: 9, nombre: "Reyes, Luis", marcas: ["F"] },
    { n: 2, nombre: "motos carlos", marcas: ["F"] },
    { n: 7, nombre: "San Román, Ana", marcas: ["FJ"], quitar: true },
  ],
  lista,
);

comprobar("empareja por nombre ignorando tildes y mayúsculas", res.filas.length === 3);
comprobar("usa la posición actual, no la de la hoja", res.filas[0].n === 1 && res.filas[1].n === 2);
comprobar("quien no está en la lista actual se omite", res.omitidos.length === 1 && res.omitidos[0] === "Reyes, Luis");
comprobar("sale en el orden de la lista actual", res.filas.map((f) => f.id).join(",") === "a,b,c");
comprobar("la marca y el tachado viajan con la fila", res.filas[1].marcas[0] === "F" && res.filas[2].quitar === true);

// Gente actual que no sale en la hoja no se inventa filas (sin marca = nueva).
const soloActual = alinear([{ n: 1, nombre: "Pérez García, Juan", marcas: ["V"] }], lista);
comprobar("la gente actual que no está en la hoja queda sin fila", soloActual.filas.length === 1);

// Varias columnas a la vez: cada fila carga un array en el MISMO ORDEN que se
// pidió; si el modelo envía de menos, las celdas que faltan llegan como vacío.
const varias = alinear(
  [
    { n: 1, nombre: "Pérez García, Juan", marcas: ["V", "F"] },
    { n: 2, nombre: "Motos, Carlos", marcas: ["F"] },
  ],
  lista,
);
comprobar("las celdas llegan en el orden pedido", varias.filas[0].marcas.join(",") === "V,F");
comprobar("dudosa si alguna celda tiene marca", varias.filas.every((f) => f.confianza === 0.5));

// Emparejar un nombre de la hoja con una errata a un hermano existente: sus
// marcas caen en esa persona, con su nombre real, y nadie se duplica.
const parejas = { [normalizarNombre("Motos, Karlos")]: "b" };
const enlazado = alinear([{ n: 9, nombre: "Motos, Karlos", marcas: ["V"] }], lista, parejas);
comprobar(
  "la errata se enlaza a un solo hermano con su nombre real",
  enlazado.filas.length === 1 &&
    enlazado.filas[0].id === "b" &&
    enlazado.filas[0].nombre === "Motos, Carlos" &&
    enlazado.filas[0].marcas[0] === "V",
);

if (fallos) {
  console.error(`\n${fallos} fallo(s)`);
  process.exit(1);
} else {
  console.log("\nTodo correcto");
}