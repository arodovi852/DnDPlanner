# 7. Pruebas

Este documento describe **cómo se verifica que DnDPlanner funciona**: la metodología elegida, qué tipos de pruebas hay, cuáles se ejecutan automáticamente en CI y cuáles a mano. También incluye los resultados reales que se obtienen al ejecutar la suite.

Para entender **qué hace** la aplicación, ver [02-descripcion.md](02-descripcion.md). Para las **dificultades técnicas** que aparecieron al testear, ver [06-desarrollo.md §6.3.7](06-desarrollo.md).

---

## 7.1. Metodología

### 7.1.1. Estrategia general

El proyecto sigue una metodología **pragmática** orientada a pruebas de integración del backend y verificación manual estructurada del frontend. **No es TDD estricto**: la mayoría de los tests se escribieron después de la primera implementación, una vez la API había estabilizado su contrato. Esta decisión es consciente:

> **Por qué no TDD estricto:** la API cambió de forma a menudo durante los primeros 4 meses (campos añadidos, refactor de rutas). Escribir tests "primero" habría obligado a rehacerlos cada semana. Tras estabilizar el contrato (a partir del bloque 7, anotaciones y spoilers), los tests pasaron a escribirse junto al código y a fallar antes de mergear cualquier cambio que rompa una expectativa documentada.

### 7.1.2. Pirámide de pruebas aplicada al proyecto

```
                  ┌──────────────────┐
                  │   Manuales /     │   ← Pre-defensa, smoke
                  │   exploración    │      en producción
                  └──────────────────┘
                ┌──────────────────────┐
                │  Integración API     │   ← 46 tests con supertest +
                │  (Jest + supertest)  │      mongodb-memory-server
                └──────────────────────┘
              ┌──────────────────────────┐
              │  Frontend (componentes,  │   ← 47 tests con Vitest +
              │  hooks, contextos)       │      Testing Library
              └──────────────────────────┘
            ┌──────────────────────────────┐
            │  TypeScript typecheck        │   ← tsc -b en cada build
            │  + ESLint                    │      del frontend
            └──────────────────────────────┘
```

La pirámide aquí está **invertida respecto a la "clásica"**: en lugar de muchos unitarios y pocos de integración, hay un equilibrio entre tests de integración del backend (que cubren el contrato HTTP completo) y tests de frontend (que cubren componentes, hooks y contextos clave). Está justificado porque:

1. El backend es delgado en lógica pura (la mayor parte es Mongoose + Express middleware), por lo que la mayor cobertura útil viene de los tests de integración.
2. El frontend, en cambio, sí tiene lógica propia que merece test unitario: hooks de historial, splitters de texto con sintaxis personalizada (spoilers), contextos con fallback offline (modo Testing), y componentes accesibles por teclado.

### 7.1.3. Lo que NO se prueba (y por qué)

Reconocer los huecos abiertamente es parte de la metodología:

| Área | Estado | Justificación |
|---|---|---|
| Tests E2E con Playwright/Cypress | ❌ No hay | Coste/beneficio alto para un proyecto de un solo desarrollador. Las pruebas manuales estructuradas (§7.4) cubren los caminos críticos. |
| Tests de Socket.IO | ❌ No automatizados | Probados manualmente con dos navegadores. La lógica de autorización del socket reutiliza los métodos del modelo (`canEdit`, `hasAccess`) que **sí** están testeados a través de la API REST. |
| Tests de carga reales | 🟡 Pruebas ligeras manuales | 100 peticiones secuenciales (ver [08-despliegue-eval.md §C6](08-despliegue-eval.md)). Suficientes para evidenciar capacidad doméstica. |
| Tests de seguridad / pentest | ❌ No hay | Defensas básicas implementadas (helmet, rate-limit, bcrypt, JWT) pero no auditadas externamente. |

---

## 7.2. Stack de pruebas

### 7.2.0. Backend

| Herramienta | Versión | Para qué |
|---|---|---|
| **Jest** | 29.7 | Test runner y matchers (`expect`). |
| **supertest** | 7.0 | HTTP testing: lanza la app de Express en memoria y simula peticiones. |
| **mongodb-memory-server** | 11.1 | Levanta una MongoDB efímera por suite. Los tests trabajan contra datos reales sin tocar BD persistente. |
| **ESLint** | 9.18 | Análisis estático del código JavaScript del backend. |

### 7.2.0.bis. Frontend

| Herramienta | Versión | Para qué |
|---|---|---|
| **Vitest** | 4.1 | Test runner alineado con Vite (mismas transforms que el bundler de prod). |
| **@testing-library/react** | 16.3 | Render de componentes en `jsdom` con queries accesibles (getByRole, getByLabelText). |
| **@testing-library/user-event** | 14.6 | Simula interacciones reales (click, keyboard) más fielmente que `fireEvent`. |
| **@testing-library/jest-dom** | 6.9 | Matchers extra (`toBeInTheDocument`, `toHaveClass`, `toBeDisabled`...). |
| **jsdom** | 29.1 | DOM simulado para que React pueda montarse sin navegador real. |
| **TypeScript** | 5.6 | Análisis estático del frontend (typecheck en cada build). |

> ⚠️ **Por qué no mocks de Mongoose:** se descartó usar `jest.mock('../models/Campaign')` por experiencia previa: los mocks de modelos esconden errores reales de schema (validaciones que no se cumplen, índices ausentes, refs mal escritas). Trabajar contra una BD efímera en memoria es solo ~1 segundo más lento por suite y atrapa todos esos errores.

### 7.2.1. Configuración

`backend/tests/setup.js` se ejecuta antes de toda la suite:

```javascript
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterEach(async () => {
  // Limpia colecciones entre tests → cada test parte de BD vacía
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
  await mongoServer.stop();
});
```

Las variables de entorno necesarias para auth se mockean al principio:

```javascript
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
```

### 7.2.2. Cómo se construye la app para testing

`backend/src/app.js` exporta una factory `buildApp({ enableRateLimit })`:

```javascript
const app = buildApp({ enableRateLimit: false });
```

Pasar `enableRateLimit: false` evita que los 100+ tests acabasen tocando el rate limit. En producción siempre está activo.

---

## 7.3. Suites de tests automatizadas

### 7.3.0. Backend (Jest)

Hay **4 ficheros de tests** con **46 tests en total**:

| Fichero | Tests | Cobertura funcional |
|---|---|---|
| `api.test.js` | 2 | Smoke tests: la app construye y `/api/health` responde. |
| `auth.test.js` | 18 | Registro, login (email y username), refresh, perfil, cambio de email/password, privacidad, follow. |
| `campaign.test.js` | 12 | CRUD de campañas, share tokens, view tokens, miembros, autorización por rol. |
| `campaign-extra.test.js` | 14 | Plantillas, clone de campaña, edición de capítulos/personajes/mapa, anotaciones. |
| **Total** | **46** | — |

### 7.3.0.bis. Frontend (Vitest)

Hay **7 ficheros de tests** con **47 tests en total** ubicados en [`frontend/src/test/`](../frontend/src/test/):

| Fichero | Tests | Cobertura funcional |
|---|---|---|
| `Button.test.tsx` | 8 | Render, modifier `--small`, className extra, `type="button"` por defecto, propagación de `onClick`, comportamiento `disabled`. |
| `CampaignCard.test.tsx` | 7 | aria-label accesible, `alt` correcto en imágenes (`""` en la decorativa), activación por click, Enter y Espacio, `tabIndex=0`. |
| `ConfirmModal.test.tsx` | 8 | No render cuando `open=false`, role `alertdialog`, propagación de confirmar/cancelar, cerrar con Esc, listener inactivo cuando está cerrado. |
| `usePageTitle.test.tsx` | 4 | Concatena título + marca, soporta `null` y vacío, reacciona a re-renders. |
| `useUndoableState.test.tsx` | 10 | Estado inicial, set directo y funcional, undo/redo, limpieza de "future" al divergir, `reset`, atajos Ctrl+Z/Ctrl+Y, ignora atajos en inputs. |
| `splitSpoilers.test.tsx` | 5 | Parseo de la sintaxis `\|\|secreto\|\|` con 0, 1 o N spoilers, spoiler final, cadena vacía. |
| `AuthContext.test.tsx` | 5 | Estado inicial sin tokens, login en modo demo sin tocar la red, login normal contra API mock, captura de errores, contrato del id del usuario demo. |
| **Total** | **47** | — |

![Captura de la salida de `npm test` en la terminal mostrando los 46 tests en verde con la cobertura abajo](assets/capturas-documentacion/07-jest-output.png)

![Captura de la salida de `npm test` en la terminal mostrando los 46 tests en verde con la cobertura abajo](assets/capturas-documentacion/07-jest-output2.png)

### 7.3.1. Ejemplo: `auth.test.js`

```javascript
describe('POST /api/auth/register', () => {
  it('creates a user and returns tokens', async () => {
    const data = await register(credentialsA);
    expect(data.user.username).toBe(credentialsA.username);
    expect(data.user.email).toBe(credentialsA.email);
    expect(data.user).not.toHaveProperty('password');
    expect(data.accessToken).toMatch(/\S+\.\S+\.\S+/);
    expect(data.refreshToken).toMatch(/\S+\.\S+\.\S+/);
  });

  it('rejects duplicate emails', async () => {
    await register(credentialsA);
    const res = await request(app).post('/api/auth/register').send(credentialsA);
    expect(res.status).toBe(400);
  });

  it('rejects invalid passwords (too short)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...credentialsA, password: '123' });
    expect(res.status).toBe(400);
  });
});
```

Lo que estos 3 tests demuestran:
- El happy path crea usuario y devuelve los tokens correctamente.
- La password **no** se filtra en la respuesta.
- El servidor rechaza duplicados y passwords inválidas.

### 7.3.2. Ejemplo: `campaign.test.js` (RBAC)

```javascript
it('forbids a non-member from editing a campaign', async () => {
  const { dm, player } = await setup();
  const campaign = await createCampaign(dm, 'Solo DM');

  const res = await request(app)
    .patch(`/api/campaigns/${campaign._id}`)
    .set('Authorization', `Bearer ${player.accessToken}`)
    .send({ name: 'Hijacked!' });

  expect(res.status).toBe(403);
  expect(res.body.message).toMatch(/permission/i);
});
```

Lo que demuestra: el control de acceso del modelo (`campaign.canEdit(userId)`) funciona end-to-end vía la API REST.

### 7.3.3. Ejemplo: `campaign-extra.test.js` (templates)

```javascript
it('clones a public template into a new campaign for the current user', async () => {
  const { dm } = await setup();
  const tplRes = await request(app).get('/api/campaigns/templates/public');
  const templateId = tplRes.body.data[0]._id;

  const res = await request(app)
    .post('/api/campaigns')
    .set('Authorization', `Bearer ${dm.accessToken}`)
    .send({ name: 'My clone', templateSource: templateId });

  expect(res.status).toBe(201);
  expect(res.body.data.campaign.templateSource).toBe(templateId);
  expect(res.body.data.campaign.chapters.length).toBeGreaterThan(0);
});
```

Lo que demuestra: la clonación de plantillas copia capítulos y personajes correctamente y asigna al usuario actual como DM.

---

## 7.4. Pruebas manuales estructuradas

Aunque no haya tests automatizados del frontend, las funcionalidades críticas se verifican con un **checklist manual** antes de cada release a producción. Este checklist se ejecuta también como **smoke test** en producción tras cada deploy.

### 7.4.1. Checklist de regresión

**Autenticación**
- [ ] Registrar un nuevo usuario con email/password válidos → sesión iniciada automáticamente.
- [ ] Login con username + password → llega a `/main`.
- [ ] Login con email + password → llega a `/main`.
- [ ] Login con credenciales incorrectas → mensaje de error visible.
- [ ] Logout → redirige a página de bienvenida.
- [ ] Refrescar página tras login → sesión persiste (refresh token funciona).

**Modo Testing**
- [ ] Login con `Testing` / `1234QWer` → entra sin tocar el backend.
- [ ] Crear una campaña → aparece en el listado.
- [ ] Recargar página → la campaña sigue ahí (localStorage).
- [ ] Limpiar storage del navegador → desaparece (comportamiento esperado).

**Perfil**
- [ ] Editar avatar (crop modal funciona).
- [ ] Editar nombre y descripción.
- [ ] Activar modo privado → mi perfil deja de aparecer en `/users` para sesiones de otros.
- [ ] Cambiar email → siguiente login con el nuevo email funciona.
- [ ] Cambiar password → siguiente login con la nueva password funciona, la antigua falla.

**Campañas**
- [ ] Crear desde plantilla "Campollano" → llegan los 12 capítulos clonados.
- [ ] Crear desde cero (Blank) → campaña vacía.
- [ ] Renombrar desde el hub.
- [ ] Cambiar visibilidad pública/privada → aparece/desaparece en `/main` para anónimos.
- [ ] Subir imagen de portada.
- [ ] Eliminar campaña → confirmación + desaparece + no se puede acceder por URL.

**Miembros e invitaciones**
- [ ] Generar link de invitación → el link es accesible.
- [ ] Otro usuario abre el link → se añade como Player automáticamente.
- [ ] Cambiar rol de un miembro (DM, Co-DM, Player) → ver cambios en la UI del miembro afectado.
- [ ] Expulsar miembro → desaparece del panel + pierde acceso a la campaña.
- [ ] Regenerar link → el antiguo deja de funcionar.

**Capítulos y eventos**
- [ ] Crear nuevo capítulo (solo DM/Co-DM).
- [ ] Renombrar capítulo.
- [ ] Eliminar capítulo (solo DM).
- [ ] Crear evento de cada tipo (Mission, Combat, etc.) y verificar icono.
- [ ] Responder a un evento (reply anidado).
- [ ] Los jugadores **leen** eventos pero no pueden crear ni borrar.

**Mapa táctico**
- [ ] Pintar terreno con el lápiz (varios tipos).
- [ ] Colocar fichas de personajes en el mapa.
- [ ] Arrastrar fichas de una celda a otra.
- [ ] Click en ficha → popup de stats con HP, AC, etc.
- [ ] Anotar con chincheta y verificar tooltip al hover.
- [ ] Borrar contenido de una celda.
- [ ] Como jugador: las herramientas aparecen deshabilitadas, popup de stats sí funciona.

**Hojas de personaje**
- [ ] Crear personaje nuevo (jugador / enemigo).
- [ ] Editar nombre, clase, raza, nivel → cambios persistidos.
- [ ] Cambiar HP actual → cambio inmediato + se ve en el popup del mapa.
- [ ] Cambiar STR → modificador recalculado.
- [ ] Añadir / quitar item del inventario.
- [ ] Añadir / quitar hechizo.
- [ ] Recortar nuevo retrato (image crop modal).
- [ ] Como jugador, solo puedo editar mi personaje asignado.

**Tiempo real (Socket.IO)**
- [ ] Abrir la misma campaña en dos navegadores con dos usuarios distintos.
- [ ] Como DM, mover una ficha en el mapa → el otro navegador ve el cambio al instante.
- [ ] Como DM, cambiar HP de un personaje → el otro lo ve al instante.
- [ ] Cerrar uno de los navegadores → el otro sigue funcionando.

**Compartir**
- [ ] Generar link de vista → un usuario no miembro puede abrirlo y ver todo en solo lectura.
- [ ] Marcar campaña como pública → aparece en `/main` para anónimos.

**Internacionalización**
- [ ] Cambiar idioma ES → EN → toda la UI cambia sin recargar.
- [ ] Recargar → el idioma se mantiene.

**Responsive**
- [ ] Probar en móvil real (320 px) o emulador → todo legible y usable.
- [ ] El mapa funciona con eventos touch.
- [ ] El image cropper funciona en móvil (problema histórico, ver [06-desarrollo.md §6.3.5](06-desarrollo.md)).

### 7.4.2. Smoke test post-deploy

Tras cada deploy a producción, se ejecuta este subconjunto mínimo (~5 minutos):

1. La URL pública carga (HTTPS válido).
2. `/api/health` responde 200 JSON.
3. `/api/docs` muestra Swagger UI.
4. Registro de un usuario de prueba `smoketest-<timestamp>@test.com` funciona y deja entrada en Atlas.
5. Login funciona.
6. Crear una campaña → recargar → sigue ahí.
7. Eliminar el usuario de prueba en Atlas tras la verificación.

---

## 7.5. Cobertura de código

Jest se ejecuta con `--coverage` por defecto (configurado en `package.json`). Tras `npm test`, se genera `backend/coverage/` con:

- `lcov-report/index.html`: navegable, muestra cobertura línea a línea.
- `coverage-summary.json`: resumen para integración con herramientas.

### 7.5.1. Cifras de referencia

Métricas típicas obtenidas en la rama `main` actual:

| Métrica | Backend |
|---|:---:|
| Líneas | ~75 % |
| Statements | ~73 % |
| Branches | ~65 % |
| Funciones | ~78 % |

### 7.5.2. Qué áreas tienen poca cobertura (y por qué)

- **`socket/index.js`**: la autorización del socket reutiliza métodos del modelo que sí están cubiertos vía REST, pero los handlers de eventos en sí están probados manualmente, no automatizado. Mejora futura: tests con `socket.io-client` simulando dos clientes.
- **`services/cloudinary.js`**: el wrapper de Cloudinary no se testea automáticamente para no consumir cuota del plan gratuito. Se prueba manualmente subiendo un retrato.
- **`services/dnd-api.js`**: proxy a `dnd5eapi.co`. No se testea automáticamente para no depender de la API externa en CI.

### 7.5.3. Cobertura del frontend

El frontend se verifica con:

1. **Vitest + Testing Library**: 47 tests sobre componentes, hooks y contextos clave (§7.3.0.bis). Cobertura reportada por `npm run test:coverage` y publicada en CI como artifact `frontend-coverage`.
2. **TypeScript strict mode**: `tsc -b` falla el build si hay errores de tipo. Equivalente a un "test sintáctico" gigante.
3. **Checklist manual** (§7.4): completa las áreas con coste/beneficio bajo para automatizar.

---

## 7.6. Ejecución

### 7.6.1. Local

**Backend (Jest):**

```powershell
cd backend
npm test                  # Toda la suite con cobertura
npm run test:watch        # Re-ejecuta al guardar
npx jest auth.test.js     # Solo un fichero
npx jest -t "creates a user and returns tokens"   # Solo un test
```

Salida esperada:

```
 PASS  tests/api.test.js
 PASS  tests/auth.test.js
 PASS  tests/campaign.test.js
 PASS  tests/campaign-extra.test.js

Test Suites: 4 passed, 4 total
Tests:       46 passed, 46 total
Snapshots:   0 total
Time:        ~12s
```

**Frontend (Vitest):**

```powershell
cd frontend
npm test                  # Una pasada (modo CI)
npm run test:watch        # Modo interactivo con UI de Vitest
npm run test:coverage     # Genera coverage/ con reporte HTML
```

Salida esperada:

```
 Test Files  7 passed (7)
      Tests  47 passed (47)
   Duration  ~5s
```

### 7.6.2. En CI (GitHub Actions)

El workflow [`ci.yml`](../.github/workflows/ci.yml) ejecuta los tests de **backend y frontend en paralelo** en cada push y PR a `main`.

**Job backend:**

```yaml
- run: npm ci
- run: npm run lint
- run: npm test
  env:
    NODE_ENV: test
    JWT_SECRET: ci-test-jwt-secret-not-for-production
    JWT_REFRESH_SECRET: ci-test-jwt-refresh-secret-not-for-production
- uses: actions/upload-artifact@v4
  with: { name: backend-coverage, path: backend/coverage/ }
```

**Job frontend:**

```yaml
- run: npm ci
- run: npm run test:coverage
- uses: actions/upload-artifact@v4
  with: { name: frontend-coverage, path: frontend/coverage/ }
- run: npm run build
  env:
    VITE_API_URL: https://example.invalid/api
- uses: actions/upload-artifact@v4
  with: { name: frontend-dist, path: frontend/dist/ }
```

Las cifras de cobertura de ambos se publican como artifacts descargables desde la UI de Actions.

---

## 7.7. Resultados y métricas

### 7.7.1. Resumen de la última ejecución

| Métrica | Backend | Frontend |
|---|---|---|
| Test suites | 4 / 4 ✅ | 7 / 7 ✅ |
| Tests | 46 / 46 ✅ | 47 / 47 ✅ |
| Tiempo total local | ~12 s | ~5 s |
| Tiempo total CI | ~25 s | ~20 s |
| Cobertura líneas | ~75 % | ~50 % (componentes y hooks tocados; las páginas grandes se cubren manualmente) |
| Flakies detectados | 0 | 0 |

**Total combinado: 93 tests automatizados (11 ficheros).**

### 7.7.2. Distribución de tipos de assertion

Aproximación basada en la suite actual:

| Tipo de assertion | Aproximación | Ejemplos |
|---|---|---|
| Status HTTP correcto | ~40 % | `expect(res.status).toBe(200)` |
| Forma del body | ~25 % | `expect(res.body.user).not.toHaveProperty('password')` |
| Reglas de negocio | ~20 % | `expect(c.members[0].role).toBe('dm')` |
| Errores controlados | ~15 % | `expect(res.status).toBe(403); expect(res.body.code).toBe('FORBIDDEN')` |

### 7.7.3. Errores reales atrapados por los tests

Casos en los que la suite **detectó un bug antes de mergear**:

1. Refactor de `auth.controller.js` rompió `select: false` en el password → `auth.test.js` detectó que la password aparecía en la respuesta del registro.
2. Cambio en el orden de middlewares dejó `/api/health` detrás del rate-limit → `api.test.js` cayó.
3. Refactor del schema de Campaign cambió `members.role` de String a enum → un test antiguo enviaba `role: 'admin'` y falló (lo que confirmó que el enum estaba funcionando como esperado).
4. Migración de `populate('ownerId')` a denormalización dejó respuestas sin `_id` en algún caso → `campaign.test.js` lo detectó.

---

## 7.8. Mejoras pendientes en testing

Documentadas también en [10-conclusiones.md](10-conclusiones.md) como roadmap de testing:

| Mejora | Prioridad | Esfuerzo estimado |
|---|---|---|
| Tests E2E con Playwright (al menos el happy path principal) | Media | 2-3 días |
| Tests de Socket.IO con `socket.io-client` simulando dos clientes | Media | 1-2 días |
| Aumentar cobertura del frontend al 70 % (más páginas: ChapterPage, CharacterSheetPage) | Media | 2-3 días |
| Aumentar cobertura del backend al 85 % | Baja | 1-2 días |
| Test de carga real con `k6` o `wrk` | Baja | 1 día |
| Análisis de seguridad con `npm audit` automatizado en CI | Baja | <1 día |

---

> 📁 **Carpeta de assets recomendada**
> Las capturas y reports referenciados en este documento se guardan en `docs/assets/` con los nombres `07-*.png`.
