/**
 * Carga la lista transcrita de las hojas manuscritas en la base local.
 *
 * Es lo mismo que hace el botón "Restaurar lista" de la app, pero desde la
 * consola: útil después de pasar las pruebas, que dejan datos inventados.
 *
 *   pnpm semilla
 */
import { estadoInicial } from "../src/lib/modelo";

const BASE = process.env.API ?? "http://localhost:8087/api";

if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(BASE)) {
  console.error(`Esto sustituye TODA la lista. Solo contra la pila local, y ${BASE} no lo es.`);
  process.exit(1);
}

const e = estadoInicial();

const r = await fetch(`${BASE}/cambios`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ ops: [{ tipo: "reemplazar", estado: e }] }),
});

if (!r.ok) {
  console.error(`No he podido cargarla: ${r.status} ${await r.text()}`);
  console.error("¿Están levantados los contenedores? docker compose up -d");
  process.exit(1);
}

const vuelta = (await (await fetch(`${BASE}/estado`)).json()).estado as typeof e;

console.log(`Cargados ${vuelta.hermanos.length} hermanos:`);
for (const b of ["HONORARIOS", "TITULARES", "SUPLENTES"]) {
  console.log(`  ${b.padEnd(11)} ${vuelta.hermanos.filter((h) => h.bloque === b).length}`);
}
console.log(`Primero: ${vuelta.hermanos[0]?.nombre}`);
console.log(`Último:  ${vuelta.hermanos.at(-1)?.nombre}`);
