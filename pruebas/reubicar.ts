import { crearHermano, moverANumero, reubicarEnBloque } from "../src/lib/modelo";
import type { Bloque } from "../src/types";

let fallos = 0;

const h = (nombre: string, bloque: Bloque) => crearHermano({ nombre, bloque });

const nombres = (l: ReturnType<typeof h>[]) => l.map((x) => x.nombre);

const igual = (a: string[], b: string[], msg: string) => {
  const ok = a.join("|") === b.join("|");
  console.log(`${ok ? "ok  " : "FALLO "}${msg}${ok ? "" : ` → [${a.join(", ")}] != [${b.join(", ")}]`}`);
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

// ---- moverANumero: recoloca dentro del mismo bloque ----

// Llevar a un titular al número 1 (primera posición de titulares).
{
  const r = moverANumero(lista, lista[3].id, 1);
  igual(nombres(r), ["Hon1", "Hon2", "Tit2", "Tit1", "Sup1"], "titular → nº 1 queda primero del bloque");
}

// Llevar a un honorario a la última posición de honorarios.
{
  const r = moverANumero(lista, lista[0].id, 2);
  igual(nombres(r), ["Hon2", "Hon1", "Tit1", "Tit2", "Sup1"], "honorario → nº 2 (último) queda al final de honorarios");
}

// Un suplente ya numerado M+1 → movimiento válido: a M (el último).
{
  const l2 = crearHermano({ nombre: "Sup3", bloque: "SUPLENTES" });
  const base = [...lista, l2];
  const r = moverANumero(base, base[4].id, 4);
  igual(nombres(r), ["Hon1", "Hon2", "Tit1", "Tit2", "Sup3", "Sup1"], "suplente moved to nº 4");
}

// Fuera de rango e id inexistente: no-op.
igual(nombres(moverANumero(lista, lista[2].id, 99)), nombres(lista), "titular nº 99 fuera de rango no mueve");
igual(nombres(moverANumero(lista, "nope", 1)), nombres(lista), "id inexistente no mueve");

if (fallos) process.exit(1);
console.log("reubicar OK");