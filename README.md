# DnDPlanner

Aplicación web para gestionar campañas de *Dungeons & Dragons* y otros juegos de rol de mesa: hojas de personaje, mapas tácticos, capítulos narrativos, miembros con roles diferenciados y sincronización en tiempo real entre dispositivos.

> **Proyecto Fin de Grado · 2º DAW · 2026**
> Autor: Alberto Rodríguez Oviedo

---

## ¿Qué hace?

- **Gestión de campañas** con plantillas predefinidas (Campollano, Resacón, GUERRA, Destinos Cruzados) o desde cero.
- **Hojas de personaje** completas (stats, habilidades, inventario, retrato con recorte).
- **Mapa táctico** por celdas: fichas arrastrables, terreno coloreable, anotaciones, popup de stats.
- **Capítulos y eventos** narrativos con anotaciones por miembro.
- **Roles diferenciados:** DM, Co-DM y Jugador, con permisos aplicados en cliente y servidor.
- **Tiempo real** vía Socket.IO: los cambios se propagan al instante entre miembros.
- **Modo Testing offline** (usuario `Testing` / `1234QWer`) sin necesidad de backend.
- **Responsive completo** desde 320 px (móvil pequeño) hasta escritorio 4K.
- **Internacionalización** ES / EN conmutable en caliente.

Para una descripción detallada de cada funcionalidad consulta [docs/02-descripcion.md](docs/02-descripcion.md).

## Arquitectura

```
┌─────────────────┐   HTTP/WS    ┌──────────────────┐   HTTP    ┌─────────────────┐
│    Navegador    │ ────────────▶│   web (nginx)    │ ─────────▶│  api (Express)  │
│  (React SPA)    │              │  · estáticos     │           │  · REST + WS    │
│                 │              │  · /api proxy    │           │  · JWT auth     │
└─────────────────┘              │  · /socket.io WS │           └────────┬────────┘
                                 └──────────────────┘                    │
                                                                         │ Mongoose
                                                                         ▼
                                                                  ┌─────────────┐
                                                                  │   MongoDB   │
                                                                  │   (Atlas    │
                                                                  │    o local) │
                                                                  └─────────────┘
```

- **Frontend:** React 18 + TypeScript + Vite + SCSS (ITCSS/BEM). [frontend/](frontend/)
- **Backend:** Express + Mongoose + Socket.IO + JWT. [backend/](backend/)
- **BBDD:** MongoDB 7 (local en compose) o MongoDB Atlas M0 (producción).
- **Reverse proxy:** nginx 1.27 alpine sirve los estáticos y reenvía `/api/*` y `/socket.io/*` al backend.
- **Despliegue producción:** DigitalOcean App Platform con dominio Name.com y HTTPS automático (Let's Encrypt).

Documentación completa de arquitectura: [docs/05-diseno.md](docs/05-diseno.md).

## Requisitos previos

- **Node.js** ≥ 18 (recomendado 20 LTS) — para desarrollo local fuera de Docker.
- **Docker** ≥ 24 con Docker Compose v2 — para el stack completo.
- **Git** ≥ 2.40.
- (Opcional) Cuenta en **MongoDB Atlas** y **Cloudinary** para reproducir el entorno de producción.

## Quick start — Docker (recomendado)

```powershell
# 1. Clona y entra al repo
git clone https://github.com/arodovi852/AROProyectoFinDeGrado2026.git
cd AROProyectoFinDeGrado2026

# 2. Copia las variables de entorno y rellena los JWT
Copy-Item .env.example .env
# Edita .env con tus valores. Para generar JWTs:
# [Convert]::ToHexString((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# 3. Levanta el stack completo
docker compose up -d --build

# 4. Comprueba que los tres servicios están "healthy"
docker compose ps

# 5. Abre la app en el navegador
Start-Process http://localhost:8080
```

Verificación rápida con `curl`:

```powershell
# Frontend (HTML del SPA)
curl.exe -I http://localhost:8080

# Backend a través del proxy (debe devolver { "success": true, ... })
curl.exe http://localhost:8080/api/health

# Documentación OpenAPI
Start-Process http://localhost:8080/api/docs
```

Para detener:

```powershell
docker compose down            # detiene contenedores, conserva BD
docker compose down -v         # detiene Y borra el volumen Mongo (¡pierde datos!)
```

## Quick start — desarrollo local (sin Docker)

```powershell
# Backend
cd backend
Copy-Item .env.example .env    # rellena MONGO_URI y JWTs
npm install
npm run dev                    # http://localhost:3000

# En otra terminal, frontend
cd frontend
Copy-Item .env.example .env    # VITE_API_URL=http://localhost:3000/api
npm install
npm run dev                    # http://localhost:5173
```

## Documentación

Toda la documentación del proyecto vive en [docs/](docs/):

| # | Documento | Contenido |
|---|-----------|-----------|
| 01 | [Introducción](docs/01-introduccion.md) | Origen, motivación, objetivos, análisis comparativo. |
| 02 | [Descripción](docs/02-descripcion.md) | Funcionalidades, UI/UX, casos de uso. |
| 03 | [Instalación](docs/03-instalacion.md) | Pasos detallados de setup. |
| 04 | [Guía de estilos](docs/04-guia-estilos.md) | Paleta, tipografías, espaciados, componentes, prototipo Figma. |
| 05 | [Diseño](docs/05-diseno.md) | Diagramas ER, casos de uso, flujos, arquitectura, API. |
| 06 | [Desarrollo](docs/06-desarrollo.md) | Decisiones técnicas, dificultades, snippets. |
| 07 | [Pruebas](docs/07-pruebas.md) | Metodología, cobertura, resultados. |
| 08 | [Despliegue](docs/08-despliegue.md) | Proceso de despliegue paso a paso. |
| 08-eval | [Despliegue (evaluación)](docs/08-despliegue-eval.md) | Mapeo a los 8 criterios de la rúbrica del módulo de Despliegue. |
| 09 | [Manual de usuario](docs/09-manual-usuario.md) | Guía completa para el usuario final. |
| 10 | [Conclusiones](docs/10-conclusiones.md) | Evaluación crítica, lecciones aprendidas, mejoras futuras. |

## CI/CD

- [`.github/workflows/ci.yml`](.github/workflows/ci.yml) — en cada push y PR a `main`: lint + tests del backend, typecheck + build del frontend. Sube artefactos de cobertura y build.
- [`.github/workflows/cd.yml`](.github/workflows/cd.yml) — al pushear a `main` (o ejecución manual): build y push de las imágenes Docker a `ghcr.io/<usuario>/dndplanner-web` y `ghcr.io/<usuario>/dndplanner-api` con tags `:latest` y `:sha-<short>`.

## Estructura del repositorio

```
AROProyectoFinDeGrado2026/
├── .github/workflows/      # CI + CD
├── .do/app.yaml            # Spec de DigitalOcean App Platform (producción)
├── docs/                   # Documentación completa del PFG
├── frontend/               # SPA React + Vite
│   ├── Dockerfile          # Multi-stage: build + nginx serve
│   ├── nginx.conf          # Reverse proxy a /api y /socket.io
│   └── src/
├── backend/                # API Express + Socket.IO
│   ├── Dockerfile          # Imagen Node 20 alpine
│   ├── src/
│   └── tests/              # Tests Jest + supertest
├── docker-compose.yml      # Stack local completo (web + api + mongo)
├── .env.example            # Variables del compose
├── DEPLOYMENT.md           # Guía detallada de despliegue en DO + Name.com
└── README.md               # Este archivo
```

## URL de producción

> 🌐 **Pendiente de añadir tras el deploy final.**
> Se actualizará en este apartado con la URL pública (subdominio DigitalOcean y, posteriormente, dominio Name.com con HTTPS).

## Licencia

ISC. Proyecto educativo sin fines comerciales.
