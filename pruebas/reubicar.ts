import { crearHermano, reubicarEnBloque } from "../src/lib/modelo";
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

if (fallos) process.exit(1);
console.log("reubicar OK");