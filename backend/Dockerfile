# =============================================================================
# Backend image — Express + Socket.IO + Mongoose.
#
# Imagen ligera basada en `node:20-alpine`. Una sola etapa porque el backend
# es JavaScript puro (sin transpile). Las dependencias de producción se
# instalan con `npm ci --omit=dev` para minimizar el tamaño de la imagen.
#
# El servidor expone 3000 internamente y se accede desde nginx (servicio
# `web`) vía la red `dndplanner-net`. Nunca se publica directamente al host.
# =============================================================================

FROM node:20-alpine

# Curl está disponible para healthchecks y `dumb-init` para que SIGTERM
# llegue correctamente al proceso node (en lugar de quedar zombie).
RUN apk add --no-cache dumb-init wget

WORKDIR /app

# Capa de dependencias: si solo cambia el código fuente, Docker reutiliza
# este layer y no reinstala módulos.
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .

# Variables que el código espera. Las que llevan secretos (MONGO_URI, JWT_*)
# se inyectan desde docker-compose / DigitalOcean en tiempo de ejecución.
ENV NODE_ENV=production \
    PORT=3000

EXPOSE 3000

# Healthcheck para que Docker reporte el estado del contenedor. El endpoint
# /api/health devuelve 200 cuando Mongo está conectado.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/api/health || exit 1

# `dumb-init` actúa como PID 1: reenvía señales (SIGTERM, SIGINT) al
# proceso node y reapa zombies. Sin esto, `docker stop` espera 10s y mata
# el contenedor con SIGKILL.
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]
