# Pruebas

No hay framework. Son dos scripts que hablan con una API de verdad contra una
Postgres de verdad, porque lo que puede romperse aquí son las consultas y las
transacciones, y eso no se prueba con la base simulada.

**Hacen falta los contenedores levantados, y borran los datos que haya.** Los
dos scripts se niegan a ejecutarse contra algo que no sea `localhost`, para que
apuntarlos al NAS "solo para probar una cosa" no se lleve la lista por delante.

```bash
docker compose up -d --build
pnpm test
```

Al terminar, la base se queda con hermanos inventados (`N0`, `N1`, `N2`…). Para
recuperar la lista transcrita de las hojas:

```bash
pnpm semilla
```

Es lo mismo que el botón *Restaurar lista* de la app.

| Fichero | Qué comprueba |
|---|---|
| `api.mjs` | Cada operación por separado: altas, bajas, reordenar, marcar, quitar años, rechazo de datos inválidos y que un lote con un fallo no deje nada a medias |
| `diff.ts` | Que `diferencias(a, b)` aplicado sobre una base que contiene `a` la deja conteniendo exactamente `b` — que es la propiedad de la que depende todo lo demás |

La segunda es la que importa. `diff.ts` es el sitio con más formas sutiles de
equivocarse: un cambio ahí que pase el compilador puede perder datos en
silencio, y la comparación contra la base lo caza.
