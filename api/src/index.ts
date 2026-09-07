import Fastify from "fastify";

import { enTransaccion, esperarBase, migrar, pool } from "./db.js";
import { leerEstado, versionActual } from "./estado.js";
import { transcribir, type TipoFoto } from "./gemini.js";
import { aplicar, ErrorPeticion, resumir } from "./operaciones.js";
import type { Operacion } from "./tipos.js";

const app = Fastify({
  logger: { level: process.env.LOG_LEVEL ?? "info" },
  // "Cargar otro Excel" manda la lista entera en una sola petición.
  bodyLimit: 8 * 1024 * 1024,
});

/** Para el healthcheck del compose. No toca la base. */
app.get("/api/salud", async () => ({ ok: true }));

/**
 * Sondeo barato. Los navegadores abiertos preguntan por esto cada pocos
 * segundos y solo se traen el estado entero si el número ha cambiado.
 */
app.get("/api/version", async () => ({ version: await versionActual() }));

app.get("/api/estado", async () => {
  // Una sola transacción para que la versión y el estado que devolvemos
  // sean la misma foto, y no una mezcla de dos instantes.
  return enTransaccion(async (c) => ({
    version: await versionActual(c),
    estado: await leerEstado(c),
  }));
});

app.post<{ Body: { ops?: Operacion[] } }>("/api/cambios", async (req, reply) => {
  const ops = req.body?.ops;
  if (!Array.isArray(ops)) throw new ErrorPeticion("falta la lista de operaciones");
  if (!ops.length) return { version: await versionActual() };
  if (ops.length > 2000) throw new ErrorPeticion("demasiadas operaciones de golpe");

  const version = await enTransaccion(async (c) => {
    await aplicar(c, ops);
    const r = await c.query<{ id: number }>(
      "INSERT INTO cambio (ops, resumen) VALUES ($1, $2) RETURNING id",
      [ops.length, resumir(ops)]
    );
    return r.rows[0]!.id;
  });

  reply.code(200);
  return { version };
});

/**
 * Volcado por foto: el navegador sube una imagen en base64 y el servidor la
 * manda a Gemini para leer las marcas de la tabla. La API key de Gemini vive
 * aquí (variable de entorno), nunca en el navegador. La imagen sale a Google.
 */
app.post<{ Body: { imagenBase64?: string; columna?: number; tipo?: TipoFoto } }>("/api/foto", async (req) => {
  const tipo: TipoFoto = req.body?.tipo === "cuotas" ? "cuotas" : "asistencia";
  const filas = await transcribir(req.body?.imagenBase64 ?? "", req.body?.columna ?? 0, tipo);
  return { filas };
});

app.setErrorHandler((err, _req, reply) => {
  if (err instanceof ErrorPeticion) {
    app.log.warn({ err: err.message }, "petición rechazada");
    return reply.code(err.codigo).send({ error: err.message });
  }
  app.log.error(err);
  return reply.code(500).send({ error: "error interno" });
});

async function arrancar(): Promise<void> {
  await esperarBase();
  await migrar();
  await app.listen({ port: Number(process.env.PORT ?? 3000), host: "0.0.0.0" });
}

// Docker manda SIGTERM al parar. Cerrar bien evita conexiones colgadas
// en Postgres tras cada despliegue.
for (const s of ["SIGTERM", "SIGINT"] as const) {
  process.on(s, () => {
    app.log.info(`${s} recibido, cerrando`);
    void app
      .close()
      .then(() => pool.end())
      .then(() => process.exit(0));
  });
}

arrancar().catch((e) => {
  app.log.error(e, "no he podido arrancar");
  process.exit(1);
});
