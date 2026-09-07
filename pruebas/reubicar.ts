import { corregirPorCupo, crearHermano, moverANumero, reubicarEnBloque } from "../src/lib/modelo";
import type { Bloque } from "../src/types";

let fallos = 0;

const h = (nombre: string, bloque: Bloque) => crearHermano({ nombre, bloque });

const nombres = (l: ReturnType<typeof h>[]) => l.map((x) => x.nombre);

const igual = (a: string[], b: string[], msg: string) => {
  const ok = a.join("|") === b.join("|");
  console.log(`${ok ? "ok  " : "FALLO "}${msg}${ok ? "" : ` → [${a.join(", ")}] != [${b.join(", ")}]`}`);
  if (!ok) fallos += 1;
};

const igualV = (a: string, b: string, msg: string) => {
  const ok = a === b;
  console.log(`${ok ? "ok  " : "FALLO "}${msg}${ok ? "" : ` → "${a}" != "${b}"`}`);
  if (!ok) fallos += 1;
};

const lista = [
  h("Hon1", "HONORARIOS"),
  h("Hon2", "HONORARIOS"),
  h("Tit1", "TITULARES"),
  h("Tit2", "TITULARES"),
  h("Sup1", "SUPLENTES"),
];

// Titular → honorario: la fila queda encima del primer titular.
{
  const r = reubicarEnBloque(lista, lista[3].id, "HONORARIOS");
  igual(nombres(r), ["Hon1", "Hon2", "Tit2", "Tit1", "Sup1"], "titular→honorario queda encima del primer titular");
}

// Honorario → titular: queda después del último honorario y antes del primer suplente.
{
  const r = reubicarEnBloque(lista, lista[1].id, "TITULARES");
  igual(nombres(r), ["Hon1", "Tit1", "Tit2", "Hon2", "Sup1"], "honorario→titular queda antes del primer suplente");
}

// Cualquiera → suplente: al final.
{
  const r = reubicarEnBloque(lista, lista[0].id, "SUPLENTES");
  igual(nombres(r), ["Hon2", "Tit1", "Tit2", "Sup1", "Hon1"], "cualquiera→suplente queda al final");
}

// Mismo bloque e id inexistente: no-op.
igual(nombres(reubicarEnBloque(lista, lista[2].id, "TITULARES")), nombres(lista), "mismo bloque no mueve");
igual(nombres(reubicarEnBloque(lista, "nope", "HONORARIOS")), nombres(lista), "id inexistente no mueve");

// ---- moverANumero: recoloca y decide el bloque según el cierre del cupo ----
// lista: 2 honorarios, 2 titulares, 1 suplente. Cupo 4 → titulares hasta el
// nº 4-2=2; a partir del 3º puesto es suplente.

// Llevar a un titular al número 1 (primera posición de titulares).
{
  const r = moverANumero(lista, lista[3].id, 1, 4);
  igual(nombres(r), ["Hon1", "Hon2", "Tit2", "Tit1", "Sup1"], "titular → nº 1 queda primero de los titulares");
}

// Un titular llevado a un puesto de suplente pasa a ser suplente (y al final).
{
  const r = moverANumero(lista, lista[3].id, 3, 4);
  igual(nombres(r), ["Hon1", "Hon2", "Tit1", "Sup1", "Tit2"], "titulares→ nº 3 convierte en suplente");
  igualV(r.map((x) => x.bloque).join("|"), "HONORARIOS|HONORARIOS|TITULARES|SUPLENTES|SUPLENTES", "titular → nº 3 queda como suplente");
}

// Un suplente llevado a un puesto de titular pasa a ser titular.
{
  const r = moverANumero(lista, lista[4].id, 2, 4);
  igual(nombres(r), ["Hon1", "Hon2", "Tit1", "Sup1", "Tit2"], "suplente → nº 2 queda dentro de titulares");
  igualV(r.map((x) => x.bloque).join("|"), "HONORARIOS|HONORARIOS|TITULARES|TITULARES|TITULARES", "suplente → nº 2 queda como titular");
}

// Honorarios: dentro de su tramo.
{
  const r = moverANumero(lista, lista[0].id, 2, 4);
  igual(nombres(r), ["Hon2", "Hon1", "Tit1", "Tit2", "Sup1"], "honorario → nº 2 (último) queda al final de honorarios");
}

// Fuera de rango e id inexistente: no-op.
igual(nombres(moverANumero(lista, lista[2].id, 99, 4)), nombres(lista), "titular nº 99 fuera de rango no mueve");
igual(nombres(moverANumero(lista, "nope", 1, 4)), nombres(lista), "id inexistente no mueve");

// ---- corregirPorCupo: cruzar la línea cambia titular/suplente ----

// Un suplente colocado por encima del cupo pasa a titular.
{
  const l = [...lista];
  const r = corregirPorCupo(l, [2], 4);
  igualV(r[2].bloque, "TITULARES", "suplente por encima del cupo → titular");
}
// Un titular colocado por debajo del cupo pasa a suplente.
{
  const l = [...lista];
  l[4] = { ...l[4], bloque: "TITULARES" };
  const r = corregirPorCupo(l, [4], 4);
  igualV(r[4].bloque, "SUPLENTES", "titular por debajo del cupo → suplente");
}
// Los que no cruzan (ni honorarios) no se tocan.
{
  const r = corregirPorCupo(lista, [4], 4);
  igualV(r[4].bloque, "SUPLENTES", "suplente que sigue abajo se queda");
}
// Cupo fuera de la lista: no toca nada.
igual(corregirPorCupo(lista, [3], 99), lista, "cupo fuera de la lista no toca");

if (fallos) process.exit(1);
console.log("reubicar OK");