# ---------------------------------------------------------------------------
# Etapa 1: construir la app.
# Node solo hace falta aquí. No acaba en la imagen final.
# ---------------------------------------------------------------------------
FROM node:22-alpine AS build

# corepack instala la versión de pnpm que dice "packageManager" en package.json.
# La variable evita que pida confirmación por teclado, que aquí no hay nadie.
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

WORKDIR /app

# Primero solo los ficheros de dependencias: mientras no cambien, Docker
# reutiliza esta capa y se salta la descarga entera en cada build.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Ahora el código. Esto sí cambia en cada commit.
COPY . .
RUN pnpm build

# ---------------------------------------------------------------------------
# Etapa 2: servir lo construido.
# Solo nginx y la carpeta dist/. ~50 MB en vez de ~400.
# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
