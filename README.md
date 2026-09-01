# Agrupación de Braceros de San Martín

Lista de hermanos, cuotas anuales y asistencia a las dos procesiones del año:
la Exaltación de la Santa Cruz y San Martín.

Sustituye al Excel con macros, y a que Word esté instalado.

Los datos viven en un Postgres en el NAS, así que la lista es la misma la abra
quien la abra y desde donde la abra. Ver [DESPLIEGUE.md](DESPLIEGUE.md).

## Poner en marcha

```bash
pnpm install
pnpm dev         # http://localhost:5173
pnpm build       # dist/ listo para servir como estático
pnpm typecheck
```

Si no tienes pnpm: `npm i -g pnpm` (o `corepack enable pnpm` con permisos de
administrador).

Necesitas la base y la API levantadas. Lo más cómodo es dejarlas en Docker y
correr solo vite a mano:

```bash
docker compose up postgres api
pnpm dev
```

## Cómo funciona

Los datos están en Postgres, en el NAS. Cada vez que tocas una celda, el
navegador manda **solo ese cambio** a la API, no la lista entera. Por eso dos
personas pueden estar marcando cosas distintas a la vez sin pisarse.

`src/data/lista.ts` sigue siendo la transcripción de las tres hojas manuscritas,
pero ya no es la base de datos: es la **semilla**. Solo entra cuando pulsas
*Restaurar lista*, y entonces sustituye lo que hubiera. Cada línea es:

```
puesto ; nombre ; bloque ; teléfono ; Exaltación ; San Martín
```

El puesto de la izquierda es solo referencia: **el número real lo da el orden de
las líneas**. Para mover a alguien, se mueve su línea. Eso quita de un golpe los
duplicados y los huecos de numeración que daba la hoja de papel.

Marcas: `V` asistió · `F` falta · `FJ` falta justificada · vacío no se sabe.
Cuotas: `S` pagada · `N` pendiente · vacío sin anotar. El vacío no se guarda:
en la base es la ausencia de fila.

La copia que se lee sin ordenador sigue siendo el Excel que descargas con
**Guardar Excel**.

## Pantallas

| Pestaña | Qué hace |
|---|---|
| Hermanos | Editar nombres, cambiar bloque, subir y bajar puestos, insertar y borrar |
| Cuotas | Una columna por año. Clic en la celda para ciclar vacío → S → N |
| Asistencias | Dos columnas por año, una por procesión. Clic para ciclar vacío → V → F → FJ |
| Listado en papel | Documento partido en los tres bloques, con filas vacías al final, para imprimir o guardar en PDF |

Arriba, dos comprobaciones que la hoja de papel no hacía: si honorarios más
titulares no suman el cupo te dice cuántos faltan o sobran, y si hay nombres
repetidos los nombra.

## Estructura

```
src/                      la interfaz
  App.tsx                 composición
  types.ts                modelo de datos
  constants.ts            entidad, bloques, ciclos de marcas
  styles.css              todos los estilos, incluido @media print
  data/lista.ts           la lista transcrita (semilla, no base de datos)
  lib/modelo.ts           altas, ciclos de marcas, validaciones
  lib/libro.ts            leer y escribir el .xlsx
  lib/useEstado.ts        carga, guardado y sondeo contra la API
  lib/diff.ts             convierte "el estado ha cambiado" en operaciones
  lib/api.ts              cliente HTTP y contrato de operaciones
  components/
    Resumen.tsx           cifras y avisos
    TablaHermanos.tsx     TablaCuotas.tsx      TablaAsistencias.tsx
    Celda.tsx             LineaCupo.tsx        Aviso.tsx
    PanelImpresion.tsx    VistaImpresion.tsx

api/                      el servidor
  src/index.ts            rutas
  src/estado.ts           reconstruye el Estado desde las tablas
  src/operaciones.ts      aplica cada operación, validando
  src/db.ts               conexión y migraciones
  migraciones/            el esquema en SQL
```

Las tablas no saben que hay una base de datos detrás: siguen recibiendo un
`setEst` normal de React. La costura está en `useEstado.ts`, que compara el
estado anterior con el nuevo (`diff.ts`) y manda solo la diferencia. Cambiar
un nombre es **una** operación, no un volcado de 130 hermanos.

SheetJS se carga con `import()` dinámico y solo al importar o exportar, así que
el arranque son 179 kB en vez de 600.

## Concurrencia

Cada navegador pregunta cada 8 segundos si la versión ha cambiado, y solo
entonces se trae el estado. Como las escrituras son por celda, dos personas
marcando hermanos distintos no se pisan.

Lo que sí se pisa: dos personas editando **el mismo campo del mismo hermano** a
la vez. Gana la última. Para dos o tres personas apuntando cuotas, sobra.

## Excel

**Guardar Excel** genera el libro con cuatro hojas — Resumen, Hermanos, Cuotas y
Asistencias — con las celdas de año combinadas y fórmulas en los acumulados.

**Cargar otro Excel** hace el camino inverso. Busca las hojas por nombre y las
cabeceras por texto, así que aguanta que hayan movido columnas. Las hojas viejas
que marcaban las faltas con `X` se convierten a `F` al leerlas.

Los dos que sustituyen todo — *Cargar otro Excel* y *Restaurar lista* — ahora
afectan a **todo el mundo**, no solo a tu navegador. La app avisa antes.

## La base de datos

`api/migraciones/001_esquema.sql`. Lo que importa:

- **El año es un dato**, no una columna. Añadir 2027 es una fila en
  `anio_cuota`, no una migración.
- **Las procesiones también.** El día que haya una tercera, es un `INSERT` en
  `procesion` (y tocar las etiquetas de la interfaz).
- **El vacío no existe.** «Sin anotar» es la ausencia de fila, no un valor. Por
  eso los `ENUM` solo tienen `V/F/FJ` y `S/N`.
- `hermano.puesto` es único pero `DEFERRABLE`: al reordenar hay un instante,
  dentro de la transacción, en que dos comparten número.
- La tabla `cambio` hace doble papel: bitácora de qué pasó, y número de versión
  barato para que los navegadores sepan si tienen que recargar.

Las migraciones se aplican solas al arrancar la API, dentro de un
`pg_advisory_lock` para que dos arranques a la vez no choquen.
