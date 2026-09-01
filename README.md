# Agrupación de Braceros de San Martín

Lista de hermanos, cuotas anuales y asistencia a las dos procesiones del año:
la Exaltación de la Santa Cruz y San Martín.

Sustituye al Excel con macros. No necesita servidor, base de datos ni que Word
esté instalado.

## Poner en marcha

```bash
pnpm install
pnpm dev         # http://localhost:5173
pnpm build       # dist/ listo para servir como estático
pnpm typecheck
```

Si no tienes pnpm: `npm i -g pnpm` (o `corepack enable pnpm` con permisos de
administrador).

`base: "./"` está puesto en `vite.config.ts`, así que `dist/` funciona servido
desde cualquier subcarpeta — útil si lo cuelgas del NAS.

## Cómo funciona

La lista viene **dentro del código**, en `src/data/lista.ts`, transcrita de las
tres hojas manuscritas. Cada línea es:

```
puesto ; nombre ; bloque ; teléfono ; Exaltación ; San Martín
```

El puesto de la izquierda es solo referencia: **el número real lo da el orden de
las líneas**. Para mover a alguien, se mueve su línea. Eso quita de un golpe los
duplicados y los huecos de numeración que daba la hoja de papel.

Marcas: `V` asistió · `F` falta · `FJ` falta justificada · vacío no se sabe.
Cuotas: `S` pagada · `N` pendiente · vacío sin anotar.

El estado se guarda en `localStorage` entre visitas. La copia buena sigue siendo
el Excel que descargas con **Guardar Excel**.

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
src/
  App.tsx                 estado y composición
  types.ts                modelo de datos
  constants.ts            entidad, bloques, ciclos de marcas
  styles.css              todos los estilos, incluido @media print
  data/lista.ts           la lista transcrita
  lib/modelo.ts           altas, ciclos de marcas, validaciones
  lib/libro.ts            leer y escribir el .xlsx
  lib/almacen.ts          persistencia local
  components/
    Resumen.tsx           cifras y avisos
    TablaHermanos.tsx     TablaCuotas.tsx      TablaAsistencias.tsx
    Celda.tsx             LineaCupo.tsx        Aviso.tsx
    PanelImpresion.tsx    VistaImpresion.tsx
```

SheetJS se carga con `import()` dinámico y solo al importar o exportar, así que
el arranque son 179 kB en vez de 600.

## Excel

**Guardar Excel** genera el libro con cuatro hojas — Resumen, Hermanos, Cuotas y
Asistencias — con las celdas de año combinadas y fórmulas en los acumulados.

**Cargar otro Excel** hace el camino inverso. Busca las hojas por nombre y las
cabeceras por texto, así que aguanta que hayan movido columnas. Las hojas viejas
que marcaban las faltas con `X` se convierten a `F` al leerlas.

## Si algún día lo lleva más de una persona

El siguiente paso natural es un backend con la base de datos normalizada
(`hermano`, `lista`, `puesto`, `evento`, `asistencia`): ahí el año pasa a ser un
dato y no hay que añadir columnas nunca más. Para 130 hermanos y dos procesiones
al año, esto sobra.
