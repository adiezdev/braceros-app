import { serieAsistencia } from "../src/lib/estadisticas";
import type { Hermano } from "../src/types";

let fallos = 0;

function comprobar(nombre: string, ok: boolean): void {
  if (!ok) {
    fallos += 1;
    console.error(`  ✗ ${nombre}`);
  } else {
    console.log(`  ✓ ${nombre}`);
  }
}

const h = (id: string, p: Partial<Hermano> = {}): Hermano => ({
  id,
  nombre: id,
  bloque: "TITULARES",
  telefono: "",
  notas: "",
  cuotas: {},
  asis: {},
  ...p,
});

// 10 personas con marca en 2025, 7 fueron a la exaltación; 3 de ellas
// sin anotar nada en San Martín pero con entrada (total de lista consta).
const poblacion = [
  h("1", { asis: { 2025: { exc: "V", sm: "V" } } }),
  h("2", { asis: { 2025: { exc: "V", sm: "F" } } }),
  h("3", { asis: { 2025: { exc: "V", sm: "FJ" } } }),
  h("4", { asis: { 2025: { exc: "V", sm: "V" } } }),
  h("5", { asis: { 2025: { exc: "V", sm: "" } } }),
  h("6", { asis: { 2025: { exc: "V", sm: "" } } }),
  h("7", { asis: { 2025: { exc: "V", sm: "" } } }),
  h("8", { asis: { 2025: { exc: "F", sm: "F" } } }),
  h("9", { asis: { 2025: { exc: "FJ", sm: "F" } } }),
  h("10", { asis: { 2025: { exc: "", sm: "V" } } }),
];

const serie = serieAsistencia(poblacion, [2025]);
const ano = serie[0];

comprobar("una fila por año pedido", serie.length === 1 && serie[0].anio === 2025);

comprobar(
  "exaltación: 7 v / 10 total = 70%",
  ano.exc.v === 7 && ano.exc.total === 10 && ano.exc.pct === 70,
);
comprobar("exaltación: conteos de faltas y justificadas",
  ano.exc.f === 1 && ano.exc.fj === 1);
comprobar(
  "san martín: 3 v / 10 total = 30% (los blancos cuentan en el total)",
  ano.sm.v === 3 && ano.sm.total === 10 && ano.sm.pct === 30,
);

// Año sin nadie registrado: el % es null y no divide entre 0.
const vacio = serieAsistencia(poblacion, [2030]);
comprobar(
  "año vacío: pct null y total 0",
  vacio[0].exc.total === 0 && vacio[0].exc.pct === null,
);

console.log(fallos ? `\n${fallos} comprobaciones fallan` : "\nTodo correcto");
process.exit(fallos ? 1 : 0);