# Despliegue en Digital Ocean + Name.com (gratis con GitHub Student Pack)

Esta guía resuelve el error **"No components detected"** que aparece en App Platform cuando el repo es un monorepo (`/frontend` y `/backend`) y explica todo el proceso de despliegue de principio a fin.

> **TL;DR**: el repo no tiene `package.json` en la raíz; tiene uno en `/frontend` y otro en `/backend`. App Platform necesita que le digas dónde están. Lo hacemos con el archivo `.do/app.yaml` que ya está incluido en el proyecto.

---

## 0. Lo que ya está listo

- `.do/app.yaml` → describe los dos componentes (frontend estático + backend Node) con sus directorios de origen.
- `backend/Dockerfile` → existe por si prefieres desplegar la API como contenedor.
- Frontend con `vite build` que produce `dist/`.
- Backend con `node src/server.js` y healthcheck en `/api/health`.

---

## 1. Coste real (con GitHub Student Pack)

| Servicio | Precio normal | Con Student Pack |
|---|---|---|
| **DO App Platform — Static Site** (frontend) | Gratis (3 sitios estáticos por cuenta) | Gratis |
| **DO App Platform — Basic XXS** (backend) | $5 / mes | Gratis durante ~3 años con los $200 de créditos |
| **MongoDB Atlas M0** (BBDD) | Gratis (512 MB) | Gratis para siempre |
| **Dominio Name.com** | $10–15 / año | 1 año gratis con Student Pack |
| **HTTPS / SSL** | Gratis (Let's Encrypt automático) | Gratis |

> El Student Pack tiene **$200 en créditos de DigitalOcean** *si activas la oferta*. Verifica que se haya aplicado en *Billing → Promotions* antes de seguir.

---

## 2. Por qué falla "No components detected"

App Platform escanea la raíz del repo buscando `package.json`, `requirements.txt`, `go.mod` o `Dockerfile`. En este proyecto no hay nada en la raíz: el código vive en `/frontend` y `/backend`. Tienes dos formas de arreglarlo:

### Opción A — App Spec (recomendada, ya incluida)

El archivo `.do/app.yaml` declara explícitamente los dos componentes. Cuando App Platform lo detecta, se salta el escaneo automático y usa la spec. Pasos:

1. Borra la app fallida que muestra "No components detected".
2. Vuelve a *Create → Apps*.
3. Conecta el repo. Cuando el wizard pregunte por la rama, debe detectar automáticamente el `.do/app.yaml` (si no, usa "Edit Spec" y pega su contenido).
4. Sustituye `USUARIO/DnDPlanner` por tu usuario/repo real en el `.do/app.yaml` antes de hacer commit.

### Opción B — Configurar fuente desde la UI

Si no quieres usar el `app.yaml`:

1. En el wizard, cuando muestre "No components detected", pulsa **"Edit Source"**.
2. En *Source Directory* pon `/frontend` para crear un componente.
3. App Platform detectará el `package.json` y propondrá build/run commands.
4. Repite el proceso añadiendo otro componente con *Source Directory* `/backend`.
5. Esto es lo mismo que la Opción A pero a mano y sin guardar la config en el repo.

---

## 3. Guía paso a paso (camino mínimo y gratis: solo frontend)

Si por ahora solo quieres ver la web online sin la API (el frontend ya funciona con `localStorage`):

1. **MongoDB Atlas no hace falta todavía**.
2. **Edita `.do/app.yaml`**: deja solo el bloque `static_sites` (borra `services`).
3. Cambia `repo: USUARIO/DnDPlanner` por tu repo real.
4. Commit + push:
   ```powershell
   git add .do/app.yaml
   git commit -m "chore: add DO App Platform spec"
   git push
   ```
5. En DigitalOcean → *Apps* → *Create App* → conecta el repo → confirma → **Deploy**.
6. Tu sitio estará en `https://dndplanner-xxxxx.ondigitalocean.app` en ~2-3 minutos. Coste: **0 €**.

---

## 4. Guía paso a paso (camino completo: frontend + backend + BBDD)

### 4.1 — Crear cluster MongoDB Atlas (M0 gratis)

1. Entra en https://www.mongodb.com/cloud/atlas/register y regístrate.
2. *Build a Cluster* → elige **M0 Free** → región más cercana (Frankfurt si vives en Europa).
3. *Database Access* → crea un usuario (anota usuario y contraseña).
4. *Network Access* → añade `0.0.0.0/0` para permitir cualquier IP (App Platform usa IPs dinámicas; si quieres más seguridad, configura las IPs de DO más adelante).
5. *Connect* → *Drivers* → copia la URI tipo:
   ```
   mongodb+srv://<usuario>:<password>@cluster0.xxxxx.mongodb.net/dndplanner?retryWrites=true&w=majority
   ```

### 4.2 — Conseguir las claves de Cloudinary (opcional, para subida de imágenes)

1. Regístrate gratis en https://cloudinary.com (plan free 25 GB).
2. En *Dashboard* anota: `Cloud Name`, `API Key`, `API Secret`.
3. Si no quieres usar Cloudinary aún, deja esos secrets vacíos — la API arrancará igual y solo fallarán los endpoints que suben imagen.

### 4.3 — Generar secretos para JWT

```powershell
# Genera 32 bytes aleatorios en hex (ejecuta cada comando dos veces, una para
# JWT_SECRET y otra para JWT_REFRESH_SECRET).
[Convert]::ToHexString((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### 4.4 — Editar `.do/app.yaml`

Cambia `USUARIO/DnDPlanner` por tu repo real (en los dos sitios donde aparece).

### 4.5 — Crear la app en App Platform

1. Push de la rama `main` a GitHub.
2. DigitalOcean → *Apps* → *Create App* → *GitHub* → selecciona el repo.
3. Si aparece el aviso "App Spec found in repository", acéptalo. Si no, pulsa "Edit Spec" y pega el contenido del `app.yaml`.
4. En el paso *Environment Variables*, rellena los secretos (los valores que copiaste arriba):
   - `MONGO_URI`
   - `JWT_SECRET`
   - `JWT_REFRESH_SECRET`
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (si los usas)
5. Pulsa *Create Resources*. El build inicial tarda ~5 min.

### 4.6 — Verificar que arranca

- Frontend: visita `https://dndplanner-web-xxxxx.ondigitalocean.app` (debe cargar la web).
- Backend: visita `https://dndplanner-api-xxxxx.ondigitalocean.app/api/health` (debe responder JSON con `success: true`).

---

## 5. Conectar el dominio de Name.com

> Name.com da **1 año gratis de un dominio `.me`** dentro del Student Pack. Una vez registrado:

### 5.1 — Añadir el dominio en App Platform

1. App Platform → tu app → *Settings* → *Domains* → *Add Domain*.
2. Escribe el dominio (`tudominio.me`) → *Add Domain*.
3. DO te dará uno de estos dos métodos:
   - **CNAME / ALIAS** (recomendado para subdominios): apunta `www` o `app` a `tudominio-xxxxx.ondigitalocean.app`.
   - **A records** (para dominio raíz): añade los registros `A` que indique DO.

### 5.2 — Configurar DNS en Name.com

1. Entra en https://www.name.com → *Domains* → *Manage* del dominio.
2. *DNS Records* → *Add Record*.
3. Para `www.tudominio.me` (subdominio):
   - Type: `CNAME`
   - Host: `www`
   - Answer: `dndplanner-web-xxxxx.ondigitalocean.app`
   - TTL: `300`
4. Para el dominio raíz (`tudominio.me`):
   - Añade los `A` records que muestre DigitalOcean (suelen ser 4 IPs).
   - Si Name.com soporta `ALIAS`/`ANAME` para apex, mejor:
     - Type: `ANAME` (o `ALIAS`)
     - Host: en blanco (o `@`)
     - Answer: `dndplanner-web-xxxxx.ondigitalocean.app`
5. Guarda y espera 5–60 minutos. Verifica con:
   ```powershell
   Resolve-DnsName tudominio.me
   ```
6. Cuando DO detecte el DNS, emitirá un certificado HTTPS automático (Let's Encrypt). El estado en *Domains* pasará de "Pending" a "Active".

### 5.3 — Apuntar la API al subdominio (opcional)

Si quieres separar `web` y `api`:
- `app.tudominio.me` → CNAME al frontend.
- `api.tudominio.me` → CNAME al backend.
- Actualiza `CORS_ORIGIN` del backend para que apunte a `https://app.tudominio.me`.

---

## 6. Cómo está conectado el frontend con el backend (estado actual)

Desde la última sesión el frontend **ya consume la API** en lugar del `localStorage`. Lo que tienes que verificar tras el deploy:

1. **`VITE_API_URL`** se inyecta en build time desde `.do/app.yaml`. Apunta a `${dndplanner-api.PUBLIC_URL}/api` (con el sufijo `/api` que el cliente espera).
2. **Socket.IO** comparte ese mismo host: el cliente deriva la URL del WebSocket quitando el sufijo `/api`. No necesitas otra variable.
3. **`CORS_ORIGIN`** del backend apunta automáticamente al dominio del frontend (`${dndplanner-web.PUBLIC_URL}`). Si después conectas un dominio propio (Name.com), actualízalo manualmente.
4. **Tokens JWT** se guardan en `localStorage` del navegador (`dndplanner:accessToken` y `dndplanner:refreshToken`). El cliente refresca automáticamente cuando el access token expira.

Tras desplegar, verifica:

```powershell
# El backend responde
curl https://dndplanner-api-xxxxx.ondigitalocean.app/api/health

# La documentación OpenAPI carga
# (abre en el navegador)
https://dndplanner-api-xxxxx.ondigitalocean.app/api/docs

# El frontend abre y al hacer login pega al backend
# (DevTools → Network → ver llamadas a /api/auth/login)
https://dndplanner-web-xxxxx.ondigitalocean.app
```

**Datos persisten en MongoDB Atlas** — al cerrar sesión y volver a entrar (incluso desde otro dispositivo) tus campañas siguen ahí.

---

## 7. Errores comunes

| Síntoma | Causa | Solución |
|---|---|---|
| `No components detected` | Monorepo sin `app.yaml` | Añadir `.do/app.yaml` (ya está hecho) |
| `Build failed: tsc not found` | Falta `devDependencies` en build | El `build_command` debe ser `npm ci && npm run build` (no `--omit=dev`) en el frontend |
| `MongooseServerSelectionError` | IP no whitelisted en Atlas | Permitir `0.0.0.0/0` en *Network Access* |
| `NetworkError when attempting to fetch resource` en el frontend | Backend no arrancado o `VITE_API_URL` mal | Verifica `/api/health`. Si falla, mira los logs del servicio en App Platform (probablemente `MongooseServerSelectionError`). |
| `CORS error` en consola del navegador | `CORS_ORIGIN` incorrecto | Verificar que coincide con la URL pública del frontend (con HTTPS) |
| Socket.IO no conecta (errores "polling" en Network) | CORS o WebSocket bloqueado | Asegúrate de que `CORS_ORIGIN` es la URL exacta del frontend con HTTPS, sin barra al final |
| Dominio en estado "Pending" eterno | DNS aún sin propagar | Esperar hasta 60 min y revisar `Resolve-DnsName tudominio.me` |
| Certificado HTTPS no se emite | Registros DNS apuntan mal | Confirmar que el CNAME apunta exactamente a `dndplanner-web-xxxxx.ondigitalocean.app` (sin protocolo) |

---

## 8. Checklist final

- [ ] `.do/app.yaml` con tu usuario/repo correctos
- [ ] Cluster M0 creado en MongoDB Atlas + URI copiada
- [ ] Secretos JWT generados (32 bytes hex cada uno)
- [ ] (Opcional) Claves de Cloudinary
- [ ] App creada en DO App Platform y deploy verde
- [ ] `/api/health` responde 200
- [ ] `/api/docs` carga la doc OpenAPI
- [ ] Registro + login funcionan en el frontend (DevTools → Network → veo llamadas a `/api/auth/...`)
- [ ] Crear una campaña, refrescar la página: la campaña sigue ahí (persistencia en Atlas funciona)
- [ ] Abrir la misma campaña en dos pestañas con el mismo usuario, editar el mapa en una: el cambio aparece en la otra (Socket.IO funciona)
- [ ] Dominio comprado en Name.com
- [ ] Records DNS apuntando a App Platform
- [ ] HTTPS activo en `https://tudominio.me`
- [ ] `CORS_ORIGIN` actualizado al dominio definitivo

---

## 9. Plan B: solo frontend en GitHub Pages (100% gratis y sin tarjeta)

Si DigitalOcean te pide tarjeta y no quieres usar los créditos todavía:

1. En `frontend/vite.config.ts` añade `base: '/DnDPlanner/'`.
2. Instala `gh-pages`: `npm i -D gh-pages` en `/frontend`.
3. Añade script: `"deploy": "vite build && gh-pages -d dist"`.
4. `npm run deploy` desde `/frontend`.
5. En GitHub → repo → Settings → Pages → Source: branch `gh-pages`.

Esto sirve solo el frontend, gratis y sin tocar DNS. Útil para enseñar la web rápidamente.
