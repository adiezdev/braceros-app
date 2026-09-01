# ---- construir ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- dependencias solo de producción ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# ---- ejecutar ----
FROM node:22-alpine
WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps  /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY migraciones ./migraciones
COPY package.json ./

# El usuario "node" viene en la imagen. No hay motivo para correr como root.
USER node

EXPOSE 3000
CMD ["node", "dist/index.js"]
