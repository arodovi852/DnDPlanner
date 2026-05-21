# Contribuir a DnDPlanner

Gracias por tu interés en mejorar DnDPlanner. Esta guía resume cómo trabajar de forma cómoda con el repositorio: cómo levantar el entorno, qué estilo siguen el código y los commits, y qué se espera de un Pull Request antes de mergearlo.

DnDPlanner está pensado como herramienta para grupos que juegan **D&D y otros juegos de rol en persona**. Antes de abrir una propuesta grande, eche un vistazo al [roadmap en `docs/10-conclusiones.md`](docs/10-conclusiones.md#103-mejoras-futuras-propuestas) para confirmar que encaja con la dirección del proyecto.

---

## Tabla de contenidos

- [Antes de empezar](#antes-de-empezar)
- [Cómo proponer un cambio](#cómo-proponer-un-cambio)
- [Configurar el entorno de desarrollo](#configurar-el-entorno-de-desarrollo)
- [Estilo de código](#estilo-de-código)
- [Tests](#tests)
- [Convenciones de commits](#convenciones-de-commits)
- [Cómo abrir un Pull Request](#cómo-abrir-un-pull-request)
- [Reportar un bug o pedir una funcionalidad](#reportar-un-bug-o-pedir-una-funcionalidad)
- [Código de conducta](#código-de-conducta)

---

## Antes de empezar

- **Lee primero la documentación.** En particular [`docs/05-diseno.md`](docs/05-diseno.md) para la arquitectura, y [`docs/06-desarrollo.md`](docs/06-desarrollo.md) para las decisiones técnicas tomadas y por qué.
- **Busca antes de abrir.** Revisa si tu idea ya está como [issue](https://github.com/arodovi852/DnDPlanner/issues) abierto o como mejora en el roadmap.
- **Discute las propuestas grandes en un issue antes de codificar.** Para cambios pequeños (typos, bugs evidentes, mejoras de accesibilidad) puedes abrir directamente un PR; para refactors o features nuevas conviene acordar primero el enfoque para no perder tiempo.

---

## Cómo proponer un cambio

1. **Fork** del repositorio a tu cuenta.
2. **Clona tu fork** localmente y crea una rama descriptiva:
   ```bash
   git checkout -b feat/nombre-corto
   ```
3. **Implementa el cambio** (código, tests, documentación si aplica).
4. **Asegúrate de que la CI local pasa** (lint + tests, ver más abajo).
5. **Pushea a tu fork y abre un Pull Request** apuntando a `main` del repo principal.
6. **Itera con la revisión.** El mantenedor puede pedir cambios; resolvedlos en la misma rama y los nuevos commits aparecerán automáticamente en el PR.

---

## Configurar el entorno de desarrollo

Hay dos vías, según prefieras. Las dos están descritas con todo detalle en [`docs/03-instalacion.md`](docs/03-instalacion.md).

### Opción 1 — Docker Compose (recomendado)

Levanta el stack completo (frontend + backend + Mongo) en un comando:

```bash
cp .env.example .env       # rellena JWTs y, opcionalmente, Cloudinary
docker compose up -d --build
docker compose ps          # los 3 servicios en "healthy"
```

App lista en `http://localhost:8080`.

### Opción 2 — Sin Docker

Si prefieres iterar más rápido en el frontend con HMR:

```bash
# Backend
cd backend
cp .env.example .env       # MONGO_URI a tu instancia local o Atlas
npm install
npm run dev                # http://localhost:3000

# En otra terminal, frontend
cd frontend
cp .env.example .env
npm install
npm run dev                # http://localhost:5173
```

---

## Estilo de código

### TypeScript / React (frontend)

- **Componentes funcionales** con hooks. Sin clases.
- **TypeScript estricto** activado: evita `any`, sobre todo en contextos y hooks.
- **SCSS modular siguiendo ITCSS + BEM**, sin estilos en línea ni librerías de utility classes (Tailwind, etc.) por coherencia con la guía de diseño del proyecto.
- **i18n primero**: cualquier texto visible para el usuario debe ir a las llaves de `frontend/src/i18n/locales/{es,en}.json`, no hardcodeado.

### JavaScript / Express (backend)

- **CommonJS** (`require` / `module.exports`), Node 18+.
- **MVC** estricto: controllers delgados, lógica de dominio en los modelos, validación en `validators/`.
- **Códigos de error explícitos** en respuestas 4xx (`NO_TOKEN`, `TOKEN_EXPIRED`, etc.) para que el cliente reaccione específicamente.

### Reglas que aplican a ambos

- **Sin emojis en el código** salvo que aporten valor semántico (logs de arranque, mensajes a usuario en i18n).
- **Comentarios solo cuando aportan el *porqué***. Identificadores claros eliminan la mayoría de los comentarios.
- **Cero secrets en el repo.** Usa `.env.example` para documentar las variables esperadas.

---

## Tests

El proyecto exige que la CI pase en verde antes de mergear:

```bash
# Backend (Jest + supertest + mongodb-memory-server)
cd backend
npm test                   # 46 tests con cobertura

# Frontend (Vitest + Testing Library)
cd frontend
npm test                   # 47 tests
npm run build              # typecheck + bundle
```

Si añades una funcionalidad nueva:

- **Backend:** añade al menos un test de integración en `backend/tests/` cubriendo el caso feliz y un caso de error.
- **Frontend:** añade un test en `frontend/src/test/` para hooks, componentes con lógica condicional o contextos no triviales.

Detalles de la suite y la cobertura en [`docs/07-pruebas.md`](docs/07-pruebas.md).

---

## Convenciones de commits

- **Mensajes en español**, en imperativo o presente, describiendo **qué hace el cambio para el producto** (no la implementación).
  - ✅ "Arreglos en persistencia de campaña al refrescar"
  - ✅ "Bloques de evento redimensionables"
  - ❌ "fix: useEffect cleanup in CampaignProvider"
- **Un cambio coherente por commit**. Si el PR tiene 5 hunks de UI + 1 de backend, divídelos.
- **No incluyas el número del PR ni el de la issue en el título**; GitHub los enlaza por sí solo en el cuerpo.

---

## Cómo abrir un Pull Request

Plantilla recomendada para el cuerpo del PR:

```markdown
## Resumen
Una o dos frases sobre qué hace este PR y a qué problema responde.

## Cambios
- Lista corta de los cambios funcionales.
- Si aplica, screenshots antes/después.

## Cómo probarlo
Pasos concretos para reproducir el efecto del cambio en local.

## Riesgos
Lo que podría romperse y por qué crees que no romperá.

## Issues relacionados
Closes #N (si aplica).
```

Antes de marcar el PR como "ready for review":

- [ ] La CI pasa verde (lint + tests + build).
- [ ] No hay `console.log` ni código comentado.
- [ ] Si tocas i18n: ambas locales (`es.json` y `en.json`) están actualizadas.
- [ ] Si tocas el modelo de datos: la migración (si la hay) está documentada.
- [ ] El comportamiento nuevo está cubierto por al menos un test.

---

## Reportar un bug o pedir una funcionalidad

Abre un [issue](https://github.com/arodovi852/DnDPlanner/issues/new/choose) con:

- **Bug:** pasos para reproducirlo, comportamiento esperado vs. real, navegador / sistema operativo / dispositivo, capturas si ayudan.
- **Funcionalidad:** caso de uso real (mesa de juego concreta a la que ayudaría), por qué la herramienta actual no lo cubre, mockup o boceto si aplica.

---

## Código de conducta

Este proyecto sigue una versión sencilla del [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/):

- Sé respetuoso. No se toleran insultos, acoso ni comentarios discriminatorios.
- Critica el código, no a las personas.
- Acepta que las decisiones técnicas del proyecto pueden no coincidir con tu preferencia; abre un issue con argumentos en vez de discutir en el PR.

Para incidentes graves, contacta al mantenedor directamente: ver [`SECURITY.md`](SECURITY.md) para la dirección de contacto.

---

¡Gracias por contribuir!
