# =============================================================================
# Frontend image — Vite SPA detrás de nginx.
#
# Multi-stage:
#   1. builder : Node 20 alpine. Instala dependencias y ejecuta `npm run build`,
#                que a su vez corre `tsc -b && vite build`. El resultado queda
#                en /app/dist (HTML + JS + CSS + assets).
#   2. runner  : nginx 1.27 alpine. Sirve los estáticos y hace reverse proxy
#                de /api/* y /socket.io/* hacia el contenedor del backend.
#
# La URL de la API se inyecta en tiempo de build con el ARG `VITE_API_URL`,
# que Vite congela como literal en el bundle (no se puede cambiar después).
# Por defecto es `/api` porque tanto el frontend como el backend están
# detrás del mismo nginx y comparten origen.
# =============================================================================

# -- Stage 1: build ----------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copiamos primero los lockfiles para aprovechar la caché de capas: si el
# código cambia pero las dependencias no, Docker reutiliza esta capa.
COPY package*.json ./
# Usamos `npm install` (no `npm ci`) porque el lockfile se genera en
# Windows y npm marca binarios opcionales de otras plataformas
# (@esbuild/netbsd-arm64, @rollup/win32...) como requeridos, lo que rompe
# `npm ci` en Linux. `npm install` resuelve las opcionales por plataforma.
# Trade-off aceptado: el build no es 100% determinístico, pero el dev
# workflow (build local Windows + build Docker Linux) lo necesita.
RUN npm install --no-audit --no-fund

COPY . .

# URL de la API inyectada en build time. Cuando la imagen se construye desde
# `docker compose build`, este valor se sobreescribe vía `args` en el compose.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# -- Stage 2: runtime --------------------------------------------------------
FROM nginx:1.27-alpine

# El index/assets del SPA en la raíz de nginx.
COPY --from=builder /app/dist /usr/share/nginx/html

# Config personalizada con reverse proxy y SPA fallback.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# nginx alpine ya escucha en 80 por defecto. Lo declaramos explícitamente
# para que `docker inspect` lo muestre.
EXPOSE 80

# Healthcheck básico: pide la portada y comprueba que devuelve 200.
# Usamos 127.0.0.1 explícito (no `localhost`) porque en algunas imágenes
# alpine `localhost` resuelve primero a IPv6 (::1) y nginx solo escucha
# en IPv4 0.0.0.0:80, causando `Connection refused` y healthchecks rojos.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/ || exit 1

# nginx:alpine ya define el CMD correcto (`nginx -g 'daemon off;'`), no hace
# falta sobreescribirlo.
