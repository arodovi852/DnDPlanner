# 6. Desarrollo

Este documento cuenta **cómo se ha construido** DnDPlanner: el orden en que se hicieron las cosas, las decisiones técnicas que se tomaron por el camino, las dificultades reales que aparecieron y cómo se resolvieron. Es el documento más subjetivo de toda la documentación, ya que refleja toda la experiencia personal del desarrollo.

Para el resultado final (arquitectura, modelo de datos, API), ver [05-diseno.md](05-diseno.md). Para lo que el código hace de cara al usuario, ver [02-descripcion.md](02-descripcion.md).

---

## 6.1. Secuencia de desarrollo

El proyecto se desarrolló en aproximadamente **7 semanas de trabajo intensivo** (aproximadamente desde principios de marzo hasta el 22 de mayo de 2026) tras un commit inicial de reserva del repositorio en enero. Es una ventana corta, así que la cronología no se mide en meses sino en bloques temáticos de 3–7 días cada uno.

 La secuencia siguió una progresión **backend-first → frontend incremental**: la API REST completa se subió de una vez, y a partir de ahí cada commit añadió una pieza del cliente que la consumía.

### 6.1.1. Cronología real por hitos

Datos obtenidos directamente del historial de Git del repositorio. Cada fase corresponde a uno o varios commits reales identificables por su SHA.

| Fase | Fecha | Hito | Commits representativos |
|---|---|---|---|
| **0. Reserva del repositorio** | 26-ene-2026 | Repositorio creado en GitHub con commit inicial vacío para reservar el nombre. | `a1137bf` Initial commit |
| **1. Backend completo de partida** | 24-mar-2026 | Subida del backend Express + Mongoose + JWT + Swagger ya estructurado en MVC, listo para consumirse desde el cliente. | `e272a68` Backend entero |
| **2. Componentes principales** | 4-abr-2026 | Primer scaffolding del frontend con Vite + React + TypeScript y los componentes BEM compartidos iniciales. | `59b67d9` Componentes principales creados |
| **3. Páginas provisionales** | 6–9-abr-2026 | Versiones placeholder de Landing, Profile y las páginas informativas, sin datos reales. Validan el sistema de rutas y el tema visual. | `ed744c0` Landing · `4d416c6` Profile · `d694e0b` Páginas provisionales |
| **4. Setup de dependencias y estilos base** | 11-abr-2026 | Configuración definitiva de rutas, paleta ITCSS, dependencias finales del frontend. | `5f19ce4` Configuración de dependencias, rutas y estilos base |
| **5. Header, Footer e i18n** | 13-abr-2026 | Componentes de layout globales con soporte de internacionalización ES/EN. | `3eb87d8` Componentes de cabecera y pie con soporte de internacionalización |
| **6. Autenticación** | 16-abr-2026 | Modal de login/registro, contexto de sesión y conexión real con la API. | `42c08b2` Implementación del sistema de autenticación con modal y contexto |
| **7. Página principal con mapa interactivo** | 19-abr-2026 | `MainPage` con el mapa de bienvenida y la sección hero. | `8e0c83a` Página principal con mapa interactivo y sección de bienvenida |
| **8. Módulo de campañas** | 21-abr-2026 | Listado, creación y gestión de campañas con el modal de creación. | `a9d0d53` Módulo de campañas: listado, creación y gestión |
| **9. Capítulos** | 23-abr-2026 | Páginas de selección y visualización de capítulos de campaña. | `c29d216` Páginas de selección y visualización de capítulos |
| **10. Personajes jugadores** | 25-abr-2026 | Selectores y ficha de personaje completa. | `0e5e0f0` Páginas de selección y ficha de personajes jugadores |
| **11. Funcionalidades sociales** | 27-abr-2026 | Perfiles públicos, listado de usuarios, follow/unfollow, panel de miembros de campaña. | `a4198ad` Perfiles de usuario, listado de usuarios y funcionalidades sociales |
| **12. Anotaciones, spoilers e invitaciones** | 30-abr-2026 | Comentarios por miembro, contenido marcable como spoiler, invitaciones por enlace + primera documentación del proyecto. | `6d131df` Anotaciones, spoilers, invitaciones y documentación |
| **13. Selector de capítulos y mejoras del editor** | 6-may-2026 | Eventos persistidos, popup de stats en el mapa, image cropper de retratos y análisis de cadena cronológica de capítulos. | `28a6221` Chapter selector, persisted events, map stats popup, image cropper · `078acc4` remove: Go-to-next-chapter + chronological-chain | `33ff240` chore: untrack .md documentation, add .gitignore |
| **14. Tiempo real + arreglos del mapa** | 8-may-2026 | Socket.IO integrado, sincronización entre jugadores, ajustes del mapa y conexión frontend↔backend. | `b89dcf6` Arreglos en el mapa, sistema de conexión entre jugadores · `02d5621` Arreglos en conexión backend ↔ frontend · `fc3f5ff` Datos para despliegue corregidos · `e99a68d` Arreglo para el despliegue |
| **15. Cuentas y despliegue** | 12-may-2026 | Configuración final de cuentas para el despliegue, primera versión funcional en DigitalOcean. | `18cbaab` Arreglo de cuentas para el despliegue · `4746b09` Miembros de campaña y configuración de cuentas |
| **16. Pulido visual y plantillas** | 13-may-2026 | Iteración de visibilidad pública/privada y refinamiento de las plantillas oficiales. | `046e6fe` Arreglos en visibilidad y diseño · `0d50022` Arreglos en visibilidad y templates |
| **17. Diseño móvil y perfil** | 14-may-2026 | Adaptación responsive de 320 px en adelante y ajustes finales del perfil. | `fd814ff` Arreglos en diseño y cambios en perfil · `507b055` Arreglos en diseño móvil |
| **18. Documentación, plugin Figma e issues retroactivos** | 17–19-may-2026 | Generación de los 11 documentos del PFG en `docs/`, plugin local de Figma para apoyar la creación de la guía de estilos, y poblado del GitHub Project con issues y milestones. | (sin commit en `main`, trabajo de cara a la entrega) |

### 6.1.2. Filosofía de iteración

Tener solo 7 semanas obligó a una estrategia muy específica:

- **Backend antes que cliente.** Subir la API completa en el primer commit grande (`e272a68`) permitió que cada commit posterior fuese estrictamente "frontend que consume X". Sin esto, cada feature habría requerido tocar dos capas a la vez y los plazos no habrían cabido.
- **Verticalidad por commit.** Cada bloque se intentó terminar **vertical y completamente** antes de pasar al siguiente: al construir las campañas, se hicieron la página de listado, el modal de creación, la conexión al backend, la persistencia en localStorage (modo Testing) y la integración con el contexto en una misma sesión. Esto da commits grandes pero coherentes — cada uno representa un trozo de aplicación que funciona de extremo a extremo.
- **Cero ramas, todo en `main`.** Trabajando solo y con un calendario apretado, el coste organizativo de mantener feature branches no compensaba. Cada commit grande representa lo que en un equipo habría sido un PR mergeado.
- **Refactor diferido.** Decisiones provisionales (componentes con literales de color, comentarios en inglés mezclados con español, ficheros largos) se aceptaron durante la fase de funcionalidad y se limpiaron en la fase 16 ("Pulido visual"). La alternativa — refactorizar a la vez que se construye — habría duplicado el tiempo por feature.

La alternativa más conservadora (avanzar en paralelo en muchas áreas inacabadas) se descartó por experiencia: en proyectos académicos lleva a tener "20 trozos al 60 %" y nada terminado para la defensa.

---

## 6.2. Decisiones técnicas clave

### 6.2.1. React + TypeScript + Vite (frontend)

| Aspecto | Decisión | Por qué |
|---|---|---|
| Framework | **React 18** | Lo más conocido y lo más demandado en el mercado. |
| Lenguaje | **TypeScript** | Detecta el 80 % de los bugs antes de ejecutar. Crucial cuando el modelo de datos es grande (Campaign tiene 10+ nivels anidados). |
| Build tool | **Vite** (no CRA) | HMR instantáneo. CRA está abandonado oficialmente. Vite es lo que la comunidad usa en 2026. |
| Router | **react-router-dom v6** | Estándar de facto. La API de v6 (`<Routes>`, `useNavigate`) es la más limpia que ha tenido React Router. |
| Estado global | **Context + reducer** (sin Redux) | El estado es naturalmente jerárquico (un usuario abre una campaña). Context cubre el caso con menos boilerplate que Redux y sin librerías extra. |
| Estilos | **SCSS modular con ITCSS + BEM** | Lo pide el módulo de Diseño Web y es lo más mantenible para una SPA grande. Tailwind se descartó por conflicto con la guía del módulo. |
| i18n | **i18next + react-i18next** | Industria estándar. Hot-reload del idioma sin recargar página. |

### 6.2.2. Express + Mongoose + Socket.IO (backend)

| Aspecto | Decisión | Por qué |
|---|---|---|
| Runtime | **Node 20 LTS** | LTS, el ecosistema npm está al día. |
| Framework | **Express 4.21** | Liviano, conocido, con un montón de middleware maduro. Probé Fastify pero la curva de aprendizaje no compensaba para este caso. |
| ORM/ODM | **Mongoose 8** | Schemas tipados, hooks (pre-save para hashear contraseñas), middlewares. Permite documentos embebidos profundos sin esfuerzo. |
| Auth | **JWT con refresh tokens** | Stateless, escalable horizontalmente. Refresh tokens almacenados server-side para poder revocar. |
| Hashing | **bcrypt cost 12** | ~250 ms por verificación. Suficiente para frenar fuerza bruta sin estresar el servidor. |
| WebSockets | **Socket.IO 4** | Más alto nivel que `ws`. Auto-reconnect, salas, fallback a polling para clientes con WebSocket bloqueado. |
| Documentación API | **swagger-jsdoc + swagger-ui-express** | Comentarios `@openapi` junto al código de la ruta. Se genera la spec automáticamente. |
| Validación | **express-validator** | Middleware encadenable, lectura clara, integrado con Express. |
| Seguridad | **helmet + express-rate-limit + cors** | Cabeceras de seguridad por defecto, rate limit por IP, CORS configurable. |

### 6.2.3. MongoDB con esquema denormalizado

La decisión más fundamental (y la que más se notó durante el desarrollo):

> Una `Campaign` lleva embebidos sus `chapters[]`, `characters[]`, `members[]` y `annotations[]`. Un solo `Campaign.findById()` trae todo lo que el editor necesita.

**Pros que sí se materializaron:**
- Cero JOINs / cero `populate()` en el caso común.
- El árbol de campaña en el cliente refleja literalmente el árbol del documento en Mongo.
- Las mutaciones del editor son `PATCH /campaigns/:id` con un diff: el backend hace `set()` y listo.

**Contras que aparecieron y cómo se resolvieron:**
- Un documento de campaña puede crecer. Mitigación: los mapas se guardan como `Map<"x-y", entity>` (sparse), no como matriz; los textos largos tienen `maxlength`.
- Si dos clientes editan el mismo árbol simultáneamente, gana el último. Mitigación: Socket.IO broadcastea cada cambio puntual y los clientes mantienen sus estados sincronizados sin chocar con persistencia.

### 6.2.4. Frontend-first

El frontend se desarrolló mucho antes que el backend "de verdad". Durante los primeros 2 meses, todo el estado vivía en `localStorage`. Esto permitió:
- Iterar sobre UX sin esperar a la API.
- Que el **modo Testing** (`Testing` / `1234QWer`) saliera "gratis" como subproducto, no como funcionalidad añadida.
- Tener algo demostrable mucho antes de tener un servidor, especialmente de cara a pruebas.

Cuando llegó el backend, la migración fue limpia porque el frontend ya operaba con la misma forma de datos que terminó en MongoDB.

### 6.2.5. Docker desde el principio del despliegue

Cuando llegó la fase de despliegue (mes 8 aprox.), se priorizó **dockerizar el stack completo en local** antes de tocar producción. Esto:
- Eliminó el "en mi máquina funciona" del proceso de defensa.
- Permitió diseñar el reverse proxy (nginx) primero localmente, sin tocar DNS ni HTTPS.
- Hizo trivial probar el despliegue en producción: las mismas imágenes que corren en local corren en App Platform.

Detalle completo en [08-despliegue.md](08-despliegue.md).

---

## 6.3. Dificultades encontradas y cómo se resolvieron

Aquí están los problemas reales que se tardaron varias horas en resolverse. Documentarlos sirve tanto de retrospectiva como de referencia futura.

### 6.3.1. Race conditions en el mapa al editar en tiempo real

**Síntoma:** dos clientes (DM y Co-DM) movían fichas simultáneamente. A veces, al recargar, una de las dos fichas "volvía" a la posición anterior.

**Diagnóstico:** ambos clientes hacían `PATCH /campaigns/:id/chapters/:cid/map` con un snapshot completo del mapa. El que persistía después sobrescribía al primero.

**Solución:**
1. Socket.IO emite cambios **granulares** (`map:cell:update` con `x`, `y` y la entidad).
2. Cada cliente aplica el cambio en su estado local en tiempo real.
3. La persistencia REST queda **debounceada a 1 segundo** y solo persiste el último estado. Si DM y Co-DM hacen varias acciones rápidas, solo se persiste una vez, con el resultado final consistente.
4. El servidor también recibe los eventos vía Socket.IO y los aplica en memoria, así que su estado autoritativo siempre es coherente.

**Lección aprendida:** "WebSocket notifica, REST persiste" es un patrón limpio para apps colaborativas pequeñas. No hace falta CRDT ni operational transforms para algo de este tamaño.

### 6.3.2. CORS roto en producción tras conectar dominio

**Síntoma:** local funcionaba. Tras conectar el dominio Name.com a App Platform, el frontend recibía `CORS policy` en consola al hacer login.

**Diagnóstico:** `CORS_ORIGIN` apuntaba al dominio `*.ondigitalocean.app`. Al añadir el dominio propio, las peticiones venían de `https://tudominio.me` y el backend las rechazaba.

**Solución:** se modificó el `app.yaml` para que `CORS_ORIGIN` referenciase la URL pública del componente frontend dinámicamente:

```yaml
- key: CORS_ORIGIN
  value: ${dndplanner-web.PUBLIC_URL}
```

Al conectar un dominio en App Platform, esta variable se actualiza sola sin necesidad de redeploy manual. **Lección:** cuando el provider lo permite, usa referencias dinámicas en lugar de hardcodear URLs.

### 6.3.3. Vite "congela" las variables de entorno en build time

**Síntoma:** cambié `VITE_API_URL` en producción y, tras un redeploy, el frontend seguía pegando al backend antiguo.

**Diagnóstico:** Vite **inyecta las `VITE_*` como literales en el bundle compilado**. Modificarlas en runtime no tiene efecto: hay que rebuildar.

**Solución:** el `app.yaml` declara `VITE_API_URL` con `scope: BUILD_TIME`. Cuando se modifica, App Platform rebuilda el frontend automáticamente. Documentado en [03-instalacion.md §3.5.3](03-instalacion.md) para que no me vuelva a pillar.

### 6.3.4. nginx 502 al reiniciar el backend

**Síntoma:** tras `docker compose restart api`, nginx devolvía 502 hasta que se reiniciaba también.

**Diagnóstico:** nginx cachea la resolución DNS de `api` por defecto, y al recrearse el contenedor su IP cambia.

**Solución:** añadir un resolver explícito en `nginx.conf`:

```nginx
resolver 127.0.0.11 valid=10s ipv6=off;
```

`127.0.0.11` es el DNS embebido de Docker. Con `valid=10s` nginx re-resuelve cada 10 segundos. Lección documentada en [05-diseno.md §5.7](05-diseno.md) y en el propio `nginx.conf`.

### 6.3.5. Recortar imágenes en navegadores móviles

**Síntoma:** el image cropper funcionaba en escritorio pero en móvil el área de recorte saltaba al tocarla.

**Diagnóstico:** estaba escuchando solo `mousedown/move/up`. Safari móvil tiene su propio juego de eventos táctiles (`touchstart/move/end`) y, por compatibilidad, también dispara los de ratón pero con offsets distintos.

**Solución:** abstraer la lectura de coordenadas en una función `getEventCoords(e)` que detecta `e.touches` y devuelve `clientX/clientY` correctos. Adjuntar **ambos** sets de listeners y prevenir el comportamiento por defecto en eventos touch para evitar el doble disparo.

### 6.3.6. localStorage saturado en modo Testing

**Síntoma:** tras varias sesiones de prueba creando campañas en modo Testing, la app empezaba a fallar con `QuotaExceededError`.

**Diagnóstico:** cada campaña con varios capítulos y mapas embebidos puede ocupar 200-500 KB en `localStorage` serializado. El límite por origen es ~5-10 MB según navegador.

**Solución:**
1. Comprimir la serialización con `lz-string` antes de guardar (compresión típica 3-5x).
2. Añadir un mensaje al usuario en modo Testing avisando que sus datos viven solo en el navegador.
3. En el roadmap: botón "Limpiar datos de demo" para reiniciar el modo Testing.

### 6.3.7. Tests de Jest contra Mongoose: "Topology closed"

**Síntoma:** algunos tests fallaban aleatoriamente con `MongoNotConnectedError: Topology closed`.

**Diagnóstico:** los tests usan `mongodb-memory-server` que arranca un Mongo en memoria. La limpieza de colecciones entre tests podía dejar la conexión en estado raro si un test anterior no había `await`-eado bien.

**Solución:** en `tests/setup.js`:

```javascript
afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
  if (mongoServer) await mongoServer.stop();
});
```

Y `jest --runInBand` (en CI) para forzar ejecución secuencial. Más detalle en [07-pruebas.md](07-pruebas.md).

---

## 6.4. Herramientas de control de versiones

### 6.4.1. Git

- **Único repositorio**: monorepo con `/frontend` y `/backend`. La separación lógica entre ambos basta y evita el coste de mantener dos repos sincronizados.
- **Rama principal**: `main`. Siempre verde (CI obligatoria en cada push).
- **Mensajes de commit**: en español, descriptivos del cambio funcional (ej.: *"Anotaciones, spoilers, invitaciones y documentación del proyecto"*) en lugar de implementación (*"Add AnnotationModel"*). Esto da una historia legible a alto nivel de qué se fue añadiendo al producto.
- **Tamaño de commits**: deliberadamente grandes — cada uno representa un bloque vertical funcional (ver §6.1.2). 28 commits en 8 meses, no 200.

### 6.4.2. GitHub

- **Issues**: usados para mantener una lista pública de bugs y mejoras pendientes.
- **Actions**: dos workflows (CI y CD) descritos en [08-despliegue.md §8.2](08-despliegue.md).
- **Packages**: publican las imágenes Docker en `ghcr.io` con tags `:latest` y `:sha-<short>`.
- **Branch protection** en `main`: requiere CI verde antes de mergear.

### 6.4.3. VSCode + extensiones

Entorno de desarrollo:

- **VSCode** como editor principal.
- **GitLens** para ver autoría y commits desde el editor.
- **ESLint** y **Prettier** integrados (auto-fix on save).
- **Thunder Client** para probar la API durante el desarrollo (alternativa ligera a Postman).
- **Docker** extension para inspeccionar contenedores y logs sin salir del editor.

---

## 6.5. Fragmentos de código relevantes

### 6.5.1. Hashing de contraseñas con hook pre-save

`backend/src/models/User.js` define un hook que hashea automáticamente la contraseña antes de guardar el documento:

```javascript
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};
```

Por qué importa: la lógica de seguridad vive **con el modelo**, no en el controller. Imposible olvidarse de hashear al registrar un usuario; imposible comparar mal al hacer login.

### 6.5.2. Middleware de autenticación

`backend/src/middleware/auth.js`:

```javascript
module.exports = async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'No token provided',
      code: 'NO_TOKEN',
    });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(payload.sub);
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }
    next();
  } catch (err) {
    const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
    return res.status(401).json({ success: false, message: err.message, code });
  }
};
```

Por qué importa: los códigos de error (`NO_TOKEN`, `TOKEN_EXPIRED`, etc.) permiten al frontend reaccionar de forma específica — en concreto, ante `TOKEN_EXPIRED` el interceptor llama a `/auth/refresh` y reintenta la petición original.

### 6.5.3. Métodos sobre el documento Campaign para autorización

`backend/src/models/Campaign.js`:

```javascript
campaignSchema.methods.hasAccess = function (userId) {
  const id = String(userId);
  if (String(this.ownerId) === id) return true;
  return this.members.some((m) => String(m.userId) === id);
};

campaignSchema.methods.getMemberRole = function (userId) {
  const id = String(userId);
  const m = this.members.find((m) => String(m.userId) === id);
  if (m) return m.role;
  if (String(this.ownerId) === id) return 'dm';
  return null;
};

campaignSchema.methods.canEdit = function (userId) {
  const role = this.getMemberRole(userId);
  return role === 'dm' || role === 'co-dm';
};
```

Por qué importa: cualquier endpoint que toca una campaña hace `if (!campaign.canEdit(req.user._id)) return 403`. La lógica de permisos vive **una sola vez** y junto a los datos.

### 6.5.4. Interceptor de refresh en el frontend

`frontend/src/api/http.ts` (resumen):

```typescript
async function http<T>(path: string, options: RequestInit = {}): Promise<T> {
  const access = localStorage.getItem('dndplanner:accessToken');
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(access ? { Authorization: `Bearer ${access}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    const body = await res.clone().json().catch(() => ({}));
    if (body.code === 'TOKEN_EXPIRED') {
      const ok = await refreshAccessToken();
      if (ok) return http<T>(path, options);                // retry una sola vez
    }
    redirectToLogin();
    throw new ApiError(401, body.message);
  }
  // ...
}
```

Por qué importa: el refresh es **transparente para el resto del código**. Cada componente hace `await http('/api/campaigns')` y nunca tiene que preocuparse por la expiración.

### 6.5.5. Socket.IO con salas por campaña

`backend/src/socket/index.js`:

```javascript
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = await User.findById(payload.sub);
    next();
  } catch (e) {
    next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  socket.on('campaign:join', async ({ campaignId }) => {
    const c = await Campaign.findById(campaignId);
    if (!c?.hasAccess(socket.user._id)) return;
    socket.join(`campaign:${campaignId}`);
  });

  socket.on('map:cell:update', async ({ campaignId, chapterId, x, y, entity }) => {
    const c = await Campaign.findById(campaignId);
    if (!c?.canEdit(socket.user._id)) return;
    // emite al resto de miembros
    socket.to(`campaign:${campaignId}`).emit('map:cell:updated', { chapterId, x, y, entity });
  });
});
```

Por qué importa: la autorización vive **una sola vez** (los mismos métodos del modelo que usan los controllers REST). Los cambios solo viajan a los miembros de la campaña, no a todos los conectados.

### 6.5.6. Hook de campaña con optimistic updates

`frontend/src/hooks/useCampaign.ts` (resumen):

```typescript
async function updateCharacter(characterId: string, patch: Partial<Character>) {
  const prev = state.campaign;
  // 1. Aplicar localmente al instante
  dispatch({ type: 'PATCH_CHARACTER', characterId, patch });
  try {
    // 2. Persistir en el backend
    await http(`/campaigns/${state.campaign._id}/characters/${characterId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  } catch (e) {
    // 3. Revertir si falla
    dispatch({ type: 'SET_CAMPAIGN', campaign: prev });
    toast.error('No se pudo guardar el cambio');
  }
}
```

Por qué importa: la UI no se queda esperando al servidor. El cambio aparece inmediatamente; si la red falla, se revierte con un mensaje. Sensación de aplicación rápida sin tener que hacer la persistencia síncrona.

---

## 6.6. Lo que se descartó por el camino

Decisiones que se exploraron y se abandonaron, con su justificación:

| Idea | Por qué se descartó |
|---|---|
| **Redux** para estado global | Context + reducer cumple lo mismo con menos boilerplate. No hubo cuello de botella de rendimiento que justificase la complejidad de Redux. |
| **Cookies HttpOnly** para JWT en lugar de localStorage | Requeriría CSRF tokens y middleware adicional. Con SPA + API en mismo origen sin cookies, la complejidad neta sumaba más que el beneficio de seguridad. |
| **Tailwind CSS** | Conflicto con la guía ITCSS / BEM del módulo de Diseño Web (ver 04). Se mantuvo SCSS modular. |
| **GraphQL** en lugar de REST | El proyecto no tenía el problema que GraphQL resuelve (clients con necesidades muy distintas). Un único cliente que carga un árbol completo se sirve perfecto con `GET /campaigns/:id`. |
| **Redis** para caché o sesiones | Stateless JWT elimina la necesidad. Las queries a Mongo son rápidas (índices correctos). Añadir Redis habría sido infraestructura extra sin beneficio medible. |
| **Sequelize / Postgres** en lugar de Mongoose / Mongo | El dominio es naturalmente documental (campañas con estructuras heterogéneas). SQL exigiría 8-10 tablas con muchos JOINs. |
| **WebSocket persistiendo directo en MongoDB** | Race conditions al editar la misma celda. Se reescribió a "WS notifica, REST persiste con debounce" (§6.3.1). |
| **CRA (Create React App)** | Oficialmente abandonado en 2023. Vite es lo que la comunidad ha adoptado como reemplazo. |
| **`useEffect` para auto-save** en hojas de personaje | El re-render disparaba auto-saves no deseados en cambios irrelevantes. Se cambió a un debounce explícito con `setTimeout` referenciado. |
| **Aplicación móvil nativa** (React Native) | Fuera de alcance. La web responsive cumple el rol; instalar como PWA está en el roadmap. |

---

## 6.7. Lecciones aprendidas

Resumen de las lecciones más relevantes del proceso. La autoevaluación más amplia está en [10-conclusiones.md](10-conclusiones.md).

1. **"Desplegado desde el principio" cambia todo el ritmo.** Tener una URL pública funcionando con la mitad de funcionalidades habría sido mejor que tenerla prácticamente al final con todo. La barrera de "cómo desplegar esto" se quita una vez y se reaprovecha siempre.
2. **Frontend-first con `localStorage` es válido**. Permite iterar UX sin esperar a la API y produce un "modo demo" gratis.
3. **Mantener `main` siempre verde** ahorra horas de bisección. Costó unas horas configurar CI; ha ahorrado días.
4. **No hay solución técnica para un alcance mal definido**. Las decisiones de "qué dejar fuera" (motor de dados, combate automatizado, marketplace) fueron las que permitieron terminar.
5. **Documentar mientras se desarrolla**. Cada decisión rara (resolver de nginx, hook pre-save, app.yaml dinámico) tiene su comentario justo donde está. Volver 3 meses después y entenderlo es trivial.
6. **TypeScript paga** en proyectos con modelo de datos profundo. Imposible olvidarse de un campo cuando el tipo te lo recuerda en el editor.
7. **Tests de integración > tests unitarios** para un proyecto así. Los 46 tests con `supertest` + `mongodb-memory-server` cubren los caminos reales sin mocks frágiles.

---

> 📁 **Carpeta de assets recomendada**
> Las capturas y diagramas referenciados en este documento se guardan en `docs/assets/` con los nombres `06-*.png`.

