import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import type { FastifyInstance } from "fastify";

import { pool } from "./db.js";

const KEY_LEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LEN).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(":");
  if (parts.length !== 2) return false;
  const [salt, hash] = parts as [string, string];
  const candidate = scryptSync(password, salt, KEY_LEN).toString("hex");
  return timingSafeEqual(Buffer.from(hash), Buffer.from(candidate));
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: { username?: string; password?: string } }>(
    "/api/login",
    async (req, reply) => {
      const { username, password } = req.body ?? {};
      if (!username || !password) {
        return reply.code(400).send({ error: "falta usuario o contraseña" });
      }

      const { rows } = await pool.query<{ id: number; hash: string; activo: boolean }>(
        "SELECT id, hash, activo FROM usuario WHERE username = $1",
        [username],
      );

      const user = rows[0];
      if (!user || !user.activo || !verifyPassword(password, user.hash)) {
        return reply.code(401).send({ error: "usuario o contraseña incorrectos" });
      }

      const token = app.jwt.sign({ id: user.id, username });
      reply.code(200);
      return { token, username };
    },
  );

  app.get("/api/yo", { preValidation: [async (req) => { await req.jwtVerify(); }] }, async (req) => {
    const payload = req.user as { id: number; username: string };
    return { id: payload.id, username: payload.username };
  });

  app.post("/api/yo", { preValidation: [async (req) => { await req.jwtVerify(); }] }, async () => {
    return { ok: true };
  });
}
