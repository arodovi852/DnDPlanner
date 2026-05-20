# 8. Despliegue

Este documento describe **cómo se despliega DnDPlanner en producción**: el entorno elegido, la configuración de CI/CD, el proceso paso a paso y la URL pública resultante. La parte de evaluación de RAs (mapeo criterio↔RA con evidencias) vive aparte en [08-despliegue-eval.md](08-despliegue-eval.md).

Para el despliegue local con Docker Compose, ver [03-instalacion.md](03-instalacion.md). Para la guía operativa muy detallada (creación de cluster Atlas, configuración DNS, etc.), ver [DEPLOYMENT.md](../DEPLOYMENT.md) en la raíz del repo.

---

## 8.1. Entorno de despliegue

### 8.1.1. Resumen

| Servicio | Proveedor | Plan | Coste real |
|---|---|---|---|
| **Frontend** (sitio estático) | DigitalOcean App Platform | Static Site | 0 € (3 sitios estáticos gratis por cuenta) |
| **Backend** (API) | DigitalOcean App Platform | Basic XXS | $5/mes (cubierto por créditos del Student Pack durante ~3 años) |
| **Base de datos** | MongoDB Atlas | M0 Free | 0 € (512 MB, backups diarios) |
| **Imágenes** (uploads) | Cloudinary | Free | 0 € (25 GB de almacenamiento, 25 GB de banda/mes) |
| **Registro Docker** | GitHub Container Registry | gratis para repos públicos | 0 € |
| **CI/CD** | GitHub Actions | gratis para repos públicos | 0 € (2000 min/mes) |
| **Dominio** | Name.com | `.me` 1 año gratis (Student Pack) | 0 € primer año, ~$15/año después |
| **HTTPS** | Let's Encrypt (App Platform automatiza) | gratis | 0 € |

> **Total real con Student Pack: 0 €/año durante los créditos.**

### 8.1.2. Por qué DigitalOcean App Platform

Se evaluaron varias alternativas durante la fase de diseño:

| Opción | Pros | Contras | Decisión |
|---|---|---|---|
| **DO App Platform** | Sencillo, integra GitHub + Docker, HTTPS automático, créditos del Student Pack. | Cuesta dinero pasado el primer año si no hay créditos. | ✅ Elegido |
| **Render / Railway / Fly.io** | Generosos en planes gratuitos. | Las plantillas free duermen tras inactividad → mala UX para defensa. | ❌ Descartado |
| **VPS clásico (DO Droplet)** | Control total, mismo precio. | Mantenimiento de SO, certificados, parches. | ❌ Descartado |
| **AWS / GCP** | Estándar de la industria. | Mucha complejidad para un proyecto académico. | ❌ Descartado |
| **GitHub Pages (solo frontend)** | Totalmente gratis. | No soporta backend. Solo serviría como plan B. | 🤝 Plan B documentado |
| **Heroku** | Histórico. | Eliminó el plan gratis en 2022. | ❌ Descartado |

### 8.1.3. Arquitectura en producción

```
                            Internet
                                │
                                ▼ HTTPS (Let's Encrypt)
                        ┌───────────────────────┐
                        │  DO App Platform      │
                        │  Ingress + TLS        │
                        └───────┬───────────────┘
                                │
                ┌───────────────┴────────────────┐
                │ path-based routing             │
                ▼                                ▼
        ┌───────────────┐               ┌────────────────┐
        │ /api/*        │               │ /*             │
        │ ↓             │               │ ↓              │
        │ Backend       │               │ Static Site    │
        │ Basic XXS     │               │ (Vite dist/)   │
        │ Node 20       │               │                │
        └───────┬───────┘               └────────────────┘
                │ mongodb+srv://
                ▼
        ┌───────────────┐               ┌────────────────┐
        │ MongoDB Atlas │               │   Cloudinary   │
        │   M0 cluster  │               │ (image hosting)│
        └───────────────┘               └────────────────┘
```

---

## 8.2. Configuración de CI/CD

El proyecto tiene dos workflows en `.github/workflows/`:

### 8.2.1. CI — `.github/workflows/ci.yml`

Se dispara en cada **push a `main`** y en cada **Pull Request a `main`**. Su misión: garantizar que `main` siempre está verde.

| Job | Pasos | Falla si... |
|---|---|---|
| `backend` | `npm ci` → `npm run lint` → `npm test` | El linter detecta problemas. Algún test de Jest falla. |
| `frontend` | `npm ci` → `npm run build` (= `tsc -b && vite build`) | El typecheck encuentra errores. El build falla. |

Cada job sube artefactos a Actions:
- `backend-coverage`: reporte HTML de cobertura de tests.
- `frontend-dist`: bundle compilado.

![Captura de la pestaña Actions de GitHub con un run reciente de CI en verde (los dos jobs healthy)](assets/capturas-documentacion/08-ci-verde.png)
### 8.2.2. CD — `.github/workflows/cd.yml`

Se dispara en cada **push a `main`** (también manualmente desde la UI con `workflow_dispatch`). Su misión: publicar imágenes Docker inmutables y trazables.

| Paso | Acción |
|---|---|
| 1 | `docker/setup-buildx-action` (motor de build multi-arch). |
| 2 | `docker/login-action` autentica contra `ghcr.io` con `GITHUB_TOKEN`. |
| 3 | `docker/metadata-action` calcula los tags: `:latest` y `:sha-<short>`. |
| 4 | `docker/build-push-action` construye y publica las dos imágenes en paralelo (matrix strategy). |
| 5 | Job `summary` imprime los 4 tags publicados en el resumen del run. |

Resultado: tras cada merge a `main`, hay disponibles en ghcr.io:

```
ghcr.io/<owner>/dndplanner-web:latest
ghcr.io/<owner>/dndplanner-web:sha-<commit>
ghcr.io/<owner>/dndplanner-api:latest
ghcr.io/<owner>/dndplanner-api:sha-<commit>
```

![Captura de la página de paquetes del repositorio en GitHub mostrando las dos imágenes con sus tags](assets/capturas-documentacion/08-ghcr-packages.png)
### 8.2.3. Despliegue automático en App Platform

App Platform se configura para hacer **deploy on push** sobre la rama `main`. El fichero [.do/app.yaml](../.do/app.yaml) declara los dos componentes:

```yaml
static_sites:
  - name: dndplanner-web
    source_dir: /frontend
    build_command: npm ci && npm run build
    output_dir: dist
    catchall_document: index.html      # SPA fallback

services:
  - name: dndplanner-api
    source_dir: /backend
    build_command: npm ci --omit=dev
    run_command: node src/server.js
    instance_size_slug: basic-xxs
    http_port: 3000
    health_check:
      http_path: /api/health
```

App Platform clona el repo en cada push, ejecuta los build commands, levanta los componentes y reemplaza la versión anterior tras pasar el healthcheck. Si el healthcheck falla, hace rollback automático.

### 8.2.4. Routing por path

El mismo `app.yaml` define que el ingress reparte el tráfico:

```yaml
ingress:
  rules:
    - match: { path: { prefix: /api } }
      component: { name: dndplanner-api, preserve_path_prefix: true }
    - match: { path: { prefix: / } }
      component: { name: dndplanner-web }
```

El orden importa: `/api` se evalúa antes que `/` para que las peticiones al backend no se sirvan como frontend.

### 8.2.5. Secrets

Variables sensibles que se configuran **una vez** en la UI de App Platform (Settings → App-Level Variables) como `SECRET`:

- `MONGO_URI` — cadena de conexión a Atlas (`mongodb+srv://user:pass@cluster.mongodb.net/dndplanner`).
- `JWT_SECRET` — 32 bytes aleatorios en hex.
- `JWT_REFRESH_SECRET` — otros 32 bytes distintos.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (opcionales).

Variables no sensibles (`CORS_ORIGIN`, `NODE_ENV`, etc.) viven en el `app.yaml` versionado. `CORS_ORIGIN` se referencia dinámicamente:

```yaml
- key: CORS_ORIGIN
  value: ${dndplanner-web.PUBLIC_URL}
```

Esto evita tener que actualizar manualmente la URL del frontend cuando cambia el dominio.

---

## 8.3. Proceso de despliegue paso a paso

Este es el procedimiento que se siguió la primera vez para poner la aplicación en producción. Se documenta para que sea repetible (defensa, mantenimiento, eventual cambio de proveedor).

### 8.3.1. Pre-requisitos

- Cuenta de GitHub con el repositorio público o privado.
- Cuenta de DigitalOcean con créditos del Student Pack activados.
- Cuenta de MongoDB Atlas (gratis).
- Cuenta de Cloudinary (gratis, opcional pero recomendado).
- Dominio en Name.com (gratis con Student Pack) — opcional, sirve sin dominio propio.

### 8.3.2. Paso 1 — Crear cluster MongoDB Atlas

1. https://www.mongodb.com/cloud/atlas/register
2. *Build a Cluster* → **M0 Free** → región **Frankfurt** (más cerca de la región `fra` de DO).
3. *Database Access* → crear usuario `dndplanner-app` con password fuerte (anotar).
4. *Network Access* → añadir `0.0.0.0/0` (App Platform usa IPs dinámicas; en una iteración futura se pueden whitelist solo las IPs de DO).
5. *Connect* → *Drivers* → copiar la URI:
   ```
   mongodb+srv://dndplanner-app:<password>@cluster0.xxxxx.mongodb.net/dndplanner?retryWrites=true&w=majority
   ```

![Captura del dashboard de Atlas con el cluster M0 activo. Ocultar credenciales sensibles si aparecen](assets/capturas-documentacion/08-atlas-cluster.png)
### 8.3.3. Paso 2 — Crear cuenta de Cloudinary (opcional)

1. https://cloudinary.com/users/register/free
2. Dashboard → anotar `Cloud Name`, `API Key`, `API Secret`.

### 8.3.4. Paso 3 — Generar secrets JWT

PowerShell 5.1:

```powershell
$bytes = New-Object byte[] 32
(New-Object System.Security.Cryptography.RNGCryptoServiceProvider).GetBytes($bytes)
($bytes | ForEach-Object { $_.ToString('x2') }) -join ''
```

Ejecutar dos veces (una para `JWT_SECRET`, otra para `JWT_REFRESH_SECRET`).

### 8.3.5. Paso 4 — Crear la app en App Platform

1. https://cloud.digitalocean.com/apps → *Create App*.
2. *GitHub* → autorizar acceso al repositorio.
3. Seleccionar `arodovi852/AROProyectoFinDeGrado2026`, rama `main`.
4. App Platform debe detectar automáticamente el `.do/app.yaml`. Si no, "Edit Spec" y pegar su contenido.
5. En el paso *Environment Variables*, rellenar los secrets:
   - `MONGO_URI`
   - `JWT_SECRET`
   - `JWT_REFRESH_SECRET`
   - `CLOUDINARY_*` (si se configuró)
6. Confirmar la región (recomendado **`fra` — Frankfurt** por latencia desde España).
7. *Create Resources*.

El primer build tarda 4-6 minutos: instala dependencias, construye el frontend, despliega el backend y verifica el healthcheck.

![Captura de la pantalla de App Platform con el deploy en progreso, mostrando los dos componentes `dndplanner-web` y `dndplanner-api`](assets/capturas-documentacion/08-do-deploy.png)

### 8.3.6. Paso 5 — Verificar que arranca

Una vez el deploy reporta "Live":

```bash
# Backend responde
curl https://dndplanner-xxxxx.ondigitalocean.app/api/health
# → {"success":true,"message":"DnDPlanner API is running","timestamp":"..."}

# OpenAPI carga
# (abrir en navegador)
https://dndplanner-xxxxx.ondigitalocean.app/api/docs

# Frontend abre y permite login
https://dndplanner-xxxxx.ondigitalocean.app
```

### 8.3.7. Paso 6 — Conectar el dominio (opcional)

1. App Platform → tu app → *Settings* → *Domains* → *Add Domain*.
2. Escribe el dominio (`tudominio.me`) → DO te da los registros DNS a configurar.
3. En Name.com → *Manage* del dominio → *DNS Records*:
   - **Subdominio** (`www.tudominio.me`): `CNAME` con valor `tudominio-xxxxx.ondigitalocean.app`.
   - **Dominio raíz** (`tudominio.me`): 4 `A` records con las IPs que indique DO, o un `ALIAS`/`ANAME` si Name.com lo permite.
4. Esperar propagación DNS (5-60 min). Verificar con `Resolve-DnsName tudominio.me`.
5. Cuando DO detecta el DNS, emite certificado HTTPS automático. El estado cambia de "Pending" a "Active".
6. Actualizar `CORS_ORIGIN` del backend para que apunte al dominio final.

![Captura de la pestaña "Domains" en App Platform con el dominio personalizado en estado "Active" y certificado HTTPS válido](assets/capturas-documentacion/08-domain-active.png)

### 8.3.8. Paso 7 — Smoke test final

Checklist de verificación:

- [ ] La URL pública (con HTTPS) carga el SPA.
- [ ] `/api/health` responde 200 con JSON.
- [ ] `/api/docs` muestra Swagger UI.
- [ ] Registro de un nuevo usuario funciona y deja entrada en Atlas.
- [ ] Login funciona y devuelve JWT.
- [ ] Crear una campaña → refrescar página → la campaña sigue ahí (persistencia OK).
- [ ] Abrir la misma campaña en dos pestañas con el mismo usuario, modificar mapa en una → cambio aparece en la otra (Socket.IO funciona en producción).
- [ ] Subir un retrato → aparece en Cloudinary Media Library (si está configurado).

---

## 8.4. Operaciones después del despliegue

### 8.4.1. Ver logs

```
DigitalOcean → Apps → dndplanner → Runtime Logs
```

O desde CLI con `doctl`:

```bash
doctl apps logs <app-id> --component dndplanner-api --follow
```

### 8.4.2. Rollback

Hay dos formas:

1. **Atlas Deploy History** (en DO): revertir al deploy anterior con un clic. Útil cuando un commit nuevo rompe producción.
2. **Re-deploy de un tag de ghcr.io**: si el problema requiere volver muy atrás, se puede desplegar manualmente un `:sha-<hash>` de ghcr.io.

### 8.4.3. Métricas

App Platform expone métricas básicas en su dashboard: CPU, memoria, peticiones por minuto, latencia P50/P95. Sin coste adicional.

Para alertas más sofisticadas se podría conectar Datadog o New Relic, pero queda fuera del alcance del proyecto académico.

### 8.4.4. Backups

- **MongoDB Atlas M0** hace backups automáticos diarios con 2 días de retención. Restauración desde la UI en un clic.
- **El código** está en GitHub (varias copias: GitHub, mi máquina, App Platform).
- **Las imágenes Docker** en ghcr.io son inmutables: cualquier `:sha-<hash>` se puede volver a desplegar.

---

## 8.5. URL de la aplicación en producción

![Captura grande de la app en producción con la URL pública visible en la barra de direcciones del navegador. Sirve como prueba para la defensa](assets/capturas-documentacion/08-url-publica.png)

---

## 8.6. Plan B — Solo frontend en GitHub Pages

Si por cualquier motivo App Platform no fuese viable durante la defensa (sin tarjeta de crédito, créditos no aplicados aún, etc.), el frontend está preparado para funcionar **sin backend**:

1. El usuario `Testing` / `1234QWer` activa el modo demo con persistencia en `localStorage`.
2. Toda la UI funciona: crear campañas, editar mapas, mover fichas, gestionar personajes.
3. No hay sincronización entre dispositivos (cada navegador es su propia "BD"), pero la defensa puede mostrarse perfectamente con una sola pestaña.

### 8.6.1. Cómo publicarlo

```powershell
cd frontend
# En vite.config.ts añadir: base: '/AROProyectoFinDeGrado2026/'
npm i -D gh-pages
# En package.json: "deploy": "vite build && gh-pages -d dist"
npm run deploy
# GitHub → repo → Settings → Pages → Source: branch gh-pages
```

URL resultante: `https://arodovi852.github.io/AROProyectoFinDeGrado2026/`.

Coste: 0 €. Sin tarjeta requerida.

---

## 8.7. Resumen

| Aspecto | Estado |
|---|---|
| Entorno productivo | DO App Platform + Atlas + Cloudinary |
| CI | GitHub Actions — lint + tests + build en cada push/PR a main |
| CD | GitHub Actions — push de imágenes a ghcr.io en cada main + deploy automático en App Platform |
| HTTPS | Let's Encrypt automático |
| Dominio | Name.com (gratis con Student Pack) |
| Coste actual | 0 €/año durante los créditos del Student Pack |
| Plan B | GitHub Pages solo frontend con modo Testing |

Para la **evaluación formal de la rúbrica de Despliegue** (mapeo criterio↔RA↔unidad↔evidencia), ver el documento aparte [08-despliegue-eval.md](08-despliegue-eval.md).

---

> 📁 **Carpeta de assets recomendada**
> Las capturas referenciadas en este documento se guardan en `docs/assets/` con los nombres `08-*.png`.
