# =============================================================================
# Definicion de los 35 issues granulares del PFG.
# El script principal (create-issues.ps1) consume este array.
#
# Campos por issue:
#   title       - titulo corto
#   body        - cuerpo en markdown
#   labels      - array de labels (deben existir en el repo)
#   milestone   - titulo del milestone (debe existir)
#   status      - "done" o "todo": los "done" se cerraran tras crearse
# =============================================================================

$Global:Issues = @(

    # -------------------------------------------------------------------------
    # M1 - Cimientos y backend
    # -------------------------------------------------------------------------

    @{
        title = "Bootstrap del repositorio y estructura inicial"
        labels = @("tipo-chore", "prioridad-alta")
        milestone = "M1 - Cimientos y backend"
        status = "done"
        body = @"
## Contexto
Inicializar el repositorio del PFG con la estructura base de carpetas (``frontend/``, ``backend/``), ``.gitignore`` y commit inicial.

## Tareas
- [x] Crear repositorio en GitHub
- [x] Anadir ``.gitignore`` con node_modules, dist, .env, etc.
- [x] Estructura base de carpetas
- [x] Commit inicial

## Criterios de aceptacion
- El repositorio se puede clonar y los directorios ``frontend/`` y ``backend/`` existen.
"@
    },

    @{
        title = "Modelado de datos: User, Campaign embebida, Follow"
        labels = @("tipo-feature", "area-backend", "area-bbdd", "prioridad-alta")
        milestone = "M1 - Cimientos y backend"
        status = "done"
        body = @"
## Contexto
Definir los esquemas Mongoose del dominio: ``User`` con credenciales, ``Campaign`` con subdocumentos embebidos (chapters, characters, members, annotations, map) y ``Follow`` para la red social.

## Decision de diseno
Optar por un unico documento ``Campaign`` con todo lo embebido (frente a coleccion separada por capitulo/personaje) porque el frontend opera sobre un arbol denormalizado y un solo ``findById`` hidrata toda la edicion.

## Tareas
- [x] Esquema ``User`` con email unico y password hasheado
- [x] Esquema ``Campaign`` con ``chapters[]``, ``characters[]``, ``members[]``
- [x] Subesquemas ``annotationSchema``, ``mapCellSchema``, ``characterStatsSchema``
- [x] Esquema ``Follow`` (relacion follower/following)
- [x] Indices necesarios
"@
    },

    @{
        title = "API de autenticacion: registro, login, JWT"
        labels = @("tipo-feature", "area-backend", "area-auth", "prioridad-alta")
        milestone = "M1 - Cimientos y backend"
        status = "done"
        body = @"
## Contexto
Endpoints REST para registro y login con validacion, hashing de password (bcrypt) y emision de JWT con expiracion configurable.

## Tareas
- [x] ``POST /api/auth/register`` con validacion de email y password
- [x] ``POST /api/auth/login`` que devuelve ``{ token, user }``
- [x] Middleware ``auth`` que verifica el JWT en cabecera ``Authorization``
- [x] Validadores en ``validators/auth.validator.js``
- [x] Tests basicos con Jest + supertest

## Criterios de aceptacion
- Un usuario puede registrarse y luego hacer login con sus credenciales.
- Endpoints protegidos devuelven 401 sin token valido.
"@
    },

    @{
        title = "API de campanas: CRUD completo con roles"
        labels = @("tipo-feature", "area-backend", "prioridad-alta")
        milestone = "M1 - Cimientos y backend"
        status = "done"
        body = @"
## Contexto
Endpoints REST para gestionar campanas, capitulos, personajes y eventos del mapa. Los miembros tienen roles ``dm``, ``co-dm`` y ``player`` con permisos diferenciados.

## Tareas
- [x] ``GET /api/campaigns`` lista las campanas del usuario
- [x] ``POST /api/campaigns`` crea una nueva (el creador es DM)
- [x] ``GET /api/campaigns/:id`` devuelve el arbol completo
- [x] ``PUT /api/campaigns/:id`` actualiza la campana (DM/Co-DM)
- [x] Endpoints anidados para chapters, characters, events, annotations
- [x] Middleware ``rbac`` que aplica roles
"@
    },

    @{
        title = "Sistema de invitaciones y miembros de campana"
        labels = @("tipo-feature", "area-backend", "prioridad-media")
        milestone = "M1 - Cimientos y backend"
        status = "done"
        body = @"
## Contexto
Permitir que un DM invite jugadores a su campana mediante token de un solo uso. El invitado acepta y queda anadido como ``player``.

## Tareas
- [x] Endpoint para generar token de invitacion
- [x] Endpoint para aceptar invitacion via token
- [x] Endpoint para listar y revocar miembros
- [x] Logica de asignacion de personaje a un player
"@
    },

    @{
        title = "Subida de imagenes a Cloudinary"
        labels = @("tipo-feature", "area-backend", "prioridad-media")
        milestone = "M1 - Cimientos y backend"
        status = "done"
        body = @"
## Contexto
Permitir subir retratos de personaje y otros recursos a Cloudinary, devolviendo la URL para almacenarla en el documento.

## Tareas
- [x] Configurar SDK de Cloudinary con credenciales en ``.env``
- [x] ``POST /api/upload`` que firma y sube la imagen
- [x] Validar tamano y tipo MIME
"@
    },

    @{
        title = "Documentacion OpenAPI/Swagger del backend"
        labels = @("tipo-docs", "area-backend", "prioridad-media")
        milestone = "M1 - Cimientos y backend"
        status = "done"
        body = @"
## Contexto
Generar y servir la documentacion OpenAPI 3 de todos los endpoints en ``/api/docs`` con ``swagger-ui-express``.

## Tareas
- [x] Configurar ``swagger-jsdoc`` para generar el spec
- [x] Anotar cada endpoint con JSDoc OpenAPI
- [x] Servir UI en ``/api/docs`` con CSP correcta
- [x] Exponer el JSON crudo en ``/api/docs/openapi.json``
"@
    },

    # -------------------------------------------------------------------------
    # M2 - Frontend base y maqueta
    # -------------------------------------------------------------------------

    @{
        title = "Setup de Vite + React + TypeScript + SCSS (ITCSS)"
        labels = @("tipo-chore", "area-frontend", "prioridad-alta")
        milestone = "M2 - Frontend base y maqueta"
        status = "done"
        body = @"
## Contexto
Inicializar el frontend con Vite, configurar TypeScript estricto y la arquitectura SCSS ITCSS (00-settings, 02-generic, 03-elements, 05-components).

## Tareas
- [x] ``npm create vite@latest`` con plantilla react-ts
- [x] Configurar paths y aliases en ``tsconfig.json``
- [x] Crear arbol ITCSS en ``src/styles/``
- [x] Definir tokens (colors, typography, spacing) en ``00-settings``
- [x] Importar fuente Mochiy Pop One desde Google Fonts
"@
    },

    @{
        title = "Configuracion de rutas con React Router"
        labels = @("tipo-chore", "area-frontend", "prioridad-alta")
        milestone = "M2 - Frontend base y maqueta"
        status = "done"
        body = @"
## Contexto
Definir el mapa de rutas de la SPA en ``App.tsx`` con ``BrowserRouter``, incluyendo redirects y catch-all.

## Tareas
- [x] Anadir ``react-router-dom``
- [x] Definir rutas principales (``/main``, ``/profile``, ``/campaigns``...)
- [x] Redirect ``/`` -> ``/main`` y catch-all ``*`` -> ``/main``
- [x] ``GlobalHeader`` que se oculta en ``/main``
"@
    },

    @{
        title = "Componentes Header y Footer con i18n"
        labels = @("tipo-feature", "area-frontend", "area-i18n", "prioridad-media")
        milestone = "M2 - Frontend base y maqueta"
        status = "done"
        body = @"
## Contexto
Componentes globales de cabecera y pie de pagina con soporte para internacionalizacion ES/EN mediante ``react-i18next``.

## Tareas
- [x] Configurar ``react-i18next`` con detector de idioma
- [x] Diccionarios ``es.json`` y ``en.json``
- [x] Header con logo, navegacion y switcher de idioma
- [x] Footer con enlaces a paginas informativas
"@
    },

    @{
        title = "Paginas provisionales (landing y profile placeholders)"
        labels = @("tipo-chore", "area-frontend", "prioridad-baja")
        milestone = "M2 - Frontend base y maqueta"
        status = "done"
        body = @"
## Contexto
Maquetar paginas provisionales como esqueleto inicial antes de integrar funcionalidad, para validar el sistema de rutas y estilos.

## Tareas
- [x] ``LandingPage`` provisional
- [x] ``ProfilePage`` provisional
- [x] Paginas informativas vacias (About, Contact, News...)
"@
    },

    @{
        title = "Sistema de componentes BEM compartidos"
        labels = @("tipo-feature", "area-frontend", "area-ui-ux", "prioridad-media")
        milestone = "M2 - Frontend base y maqueta"
        status = "done"
        body = @"
## Contexto
Crear el primer conjunto de componentes reutilizables siguiendo BEM: ``Button``, ``TextBox``, ``TranslucidTextBox``, ``Profile``, ``CampaignCard``.

## Tareas
- [x] ``Button`` con variantes (default, ``--small``) y estados
- [x] ``TextBox`` y ``TextBox--light``
- [x] ``TranslucidTextBox`` para overlays
- [x] ``Profile`` y ``CampaignCard``
- [x] SCSS partials por componente en ``05-components/``
"@
    },

    # -------------------------------------------------------------------------
    # M3 - Modulos funcionales
    # -------------------------------------------------------------------------

    @{
        title = "Autenticacion en cliente: modal y AuthContext"
        labels = @("tipo-feature", "area-frontend", "area-auth", "prioridad-alta")
        milestone = "M3 - Modulos funcionales"
        status = "done"
        body = @"
## Contexto
Modal de autenticacion (login/registro) integrado con el backend, y ``AuthContext`` que expone el usuario actual y los metodos ``login``/``logout``/``register``.

## Tareas
- [x] Componente ``AuthModal`` con tabs login/registro
- [x] ``AuthContext`` con estado y persistencia en localStorage
- [x] Interceptor ``api/client.ts`` que anade ``Authorization: Bearer``
- [x] Manejo de errores con feedback visual
"@
    },

    @{
        title = "Modo Testing offline (usuario sin backend)"
        labels = @("tipo-feature", "area-frontend", "area-auth", "prioridad-media")
        milestone = "M3 - Modulos funcionales"
        status = "done"
        body = @"
## Contexto
Permitir explorar la app sin backend con el usuario ``Testing`` / ``1234QWer``. Los datos viven en localStorage. Util para evaluacion y para que el tribunal pueda probar sin desplegar.

## Tareas
- [x] Bypass de login si las credenciales son las de testing
- [x] Persistencia local de campanas en testing
- [x] Indicador visual del modo testing
"@
    },

    @{
        title = "Pagina principal con mapa interactivo y seccion bienvenida"
        labels = @("tipo-feature", "area-frontend", "area-ui-ux", "prioridad-alta")
        milestone = "M3 - Modulos funcionales"
        status = "done"
        body = @"
## Contexto
``MainPage`` con un mapa interactivo de fondo (canvas) y una seccion de bienvenida superpuesta. Es el escaparate de la app.

## Tareas
- [x] Canvas con render del mapa de ejemplo
- [x] Seccion hero con CTA segun estado de sesion
- [x] Header con variante visual propia (renderizado por la pagina)
"@
    },

    @{
        title = "Modulo de campanas: listado y creacion"
        labels = @("tipo-feature", "area-frontend", "prioridad-alta")
        milestone = "M3 - Modulos funcionales"
        status = "done"
        body = @"
## Contexto
``CampaignsPage`` que lista las campanas del usuario y permite crear nuevas mediante ``NewCampaignModal``.

## Tareas
- [x] ``CampaignsPage`` con grid de ``CampaignCard``
- [x] ``CreateCampaignCard`` como entrada al modal
- [x] ``NewCampaignModal`` con seleccion de plantilla o desde cero
- [x] ``CampaignContext`` para estado global
"@
    },

    @{
        title = "Selectores de creador, capitulo y personaje"
        labels = @("tipo-feature", "area-frontend", "prioridad-media")
        milestone = "M3 - Modulos funcionales"
        status = "done"
        body = @"
## Contexto
Tres paginas selector que dirigen al usuario dentro de una campana: ``CreatorSelectorPage`` (DM/Player), ``ChapterOrCharacterPage``, ``ChapterSelectorPage`` y ``CharacterSelectorPage``.

## Tareas
- [x] ``CreatorSelectorPage``
- [x] ``ChapterOrCharacterPage``
- [x] ``ChapterSelectorPage``
- [x] ``CharacterSelectorPage``
- [x] Navegacion coherente entre selectores
"@
    },

    @{
        title = "Ficha de personaje completa (CharacterSheetPage)"
        labels = @("tipo-feature", "area-frontend", "prioridad-alta")
        milestone = "M3 - Modulos funcionales"
        status = "done"
        body = @"
## Contexto
Hoja de personaje editable con stats, habilidades, inventario y retrato. Incluye recortador de imagen para el retrato.

## Tareas
- [x] ``CharacterSheetPage`` con secciones (stats, skills, inventory)
- [x] Recortador de imagen (image cropper)
- [x] Persistencia al backend o localStorage en modo testing
- [x] Validaciones de campos numericos
"@
    },

    @{
        title = "Pagina de capitulo con MapCanvas y EventsCanvas"
        labels = @("tipo-feature", "area-frontend", "prioridad-alta")
        milestone = "M3 - Modulos funcionales"
        status = "done"
        body = @"
## Contexto
``ChapterPage`` es el corazon de la edicion: muestra el mapa tactico (``MapCanvas``) con fichas arrastrables y celdas coloreables, junto con el panel de eventos (``EventsCanvas``).

## Tareas
- [x] ``MapCanvas`` con grid, fichas drag-and-drop y terreno
- [x] Popup de stats al hacer click sobre una ficha
- [x] ``EventsCanvas`` con eventos cronologicos persistidos
- [x] Hooks ``useDndMonsters``, ``useDndClasses``, ``useUndoableState``
"@
    },

    @{
        title = "Perfiles de usuario, listado y red social (seguir)"
        labels = @("tipo-feature", "area-frontend", "area-backend", "prioridad-media")
        milestone = "M3 - Modulos funcionales"
        status = "done"
        body = @"
## Contexto
Funcionalidades sociales: pagina de perfil propio (``ProfilePage``), perfil publico (``UserProfilePage``), listado de usuarios (``UsersPage``) y boton de seguir/dejar de seguir.

## Tareas
- [x] ``UsersPage`` con buscador
- [x] ``UserProfilePage`` con publicaciones y campanas publicas
- [x] ``FollowButton`` y ``UsersContext``
- [x] API ``follows.ts`` en cliente y endpoints en backend
- [x] ``MembersPanel`` con miembros y roles de una campana
"@
    },

    @{
        title = "Sistema de anotaciones y spoilers"
        labels = @("tipo-feature", "area-frontend", "area-backend", "prioridad-media")
        milestone = "M3 - Modulos funcionales"
        status = "done"
        body = @"
## Contexto
Permitir anotaciones por miembro sobre capitulos y personajes, con soporte para marcar contenido como spoiler (``SpoilerText``, ``SpoilerTextarea``).

## Tareas
- [x] ``AnnotationThread`` para mostrar y crear anotaciones
- [x] Componentes ``SpoilerText`` y ``SpoilerTextarea``
- [x] Persistencia en el documento de campana
- [x] Permisos: solo el autor puede editar/borrar su anotacion
"@
    },

    @{
        title = "Sistema de invitaciones en cliente (InvitePage)"
        labels = @("tipo-feature", "area-frontend", "prioridad-media")
        milestone = "M3 - Modulos funcionales"
        status = "done"
        body = @"
## Contexto
Pagina ``/invite/:token`` que acepta una invitacion y une al usuario a la campana.

## Tareas
- [x] ``InvitePage`` que valida el token
- [x] Manejo de token expirado/invalido
- [x] Redirect a la campana tras aceptar
"@
    },

    @{
        title = "Plantillas de campana predefinidas"
        labels = @("tipo-feature", "area-frontend", "prioridad-baja")
        milestone = "M3 - Modulos funcionales"
        status = "done"
        body = @"
## Contexto
Ofrecer plantillas listas para usar (Campollano, Resacon, GUERRA, Destinos Cruzados) que el DM puede instanciar en un click.

## Tareas
- [x] ``TemplatesPage`` con catalogo
- [x] Definicion de plantillas en codigo
- [x] Boton de instanciar plantilla -> nueva campana
"@
    },

    @{
        title = "Pagina de vista publica de campana (CampaignViewPage)"
        labels = @("tipo-feature", "area-frontend", "prioridad-baja")
        milestone = "M3 - Modulos funcionales"
        status = "done"
        body = @"
## Contexto
``/view/:viewToken`` permite compartir una vista de solo lectura de la campana con quien no es miembro (por ejemplo, para mostrarla en redes).

## Tareas
- [x] ``CampaignViewPage``
- [x] Generacion de token de vista publica desde la campana
- [x] Render sin controles de edicion
"@
    },

    @{
        title = "Paginas informativas (About, Contact, News, Terms, Privacy, API, Roadmap)"
        labels = @("tipo-docs", "area-frontend", "prioridad-baja")
        milestone = "M3 - Modulos funcionales"
        status = "done"
        body = @"
## Contexto
Set de paginas estaticas accesibles desde el Footer con informacion legal y de proyecto.

## Tareas
- [x] AboutPage, ContactPage, NewsPage
- [x] TermsPage, PrivacyPage
- [x] ApiPage (enlace a Swagger UI)
- [x] RoadmapPage
"@
    },

    @{
        title = "Selector de capitulos y mejoras del editor"
        labels = @("tipo-feature", "area-frontend", "prioridad-media")
        milestone = "M3 - Modulos funcionales"
        status = "done"
        body = @"
## Contexto
Refactor del selector de capitulos y mejoras del editor: eventos persistidos, popup de stats del mapa, image cropper y analisis de cadena cronologica para el boton ``Go to next chapter``.

## Tareas
- [x] Refactor ``ChapterSelectorPage``
- [x] Eventos persistidos en backend
- [x] Popup de stats en el mapa
- [x] Image cropper para retratos
- [x] Logica de cadena cronologica para navegacion entre capitulos
"@
    },

    # -------------------------------------------------------------------------
    # M4 - Pulido y despliegue
    # -------------------------------------------------------------------------

    @{
        title = "Tiempo real con Socket.IO entre miembros"
        labels = @("tipo-feature", "area-backend", "area-tiempo-real", "prioridad-alta")
        milestone = "M4 - Pulido y despliegue"
        status = "done"
        body = @"
## Contexto
Sincronizar los cambios de una campana entre todos los miembros conectados (mapa, eventos, anotaciones) en tiempo real con Socket.IO.

## Tareas
- [x] Servidor Socket.IO en backend con namespaces por campana
- [x] Autenticacion del socket via JWT
- [x] Cliente ``socket.ts`` y hook ``useCampaignSocket``
- [x] Emision de eventos al editar y suscripcion en otros clientes
"@
    },

    @{
        title = "Conexion frontend-backend: ajustes finales y CORS"
        labels = @("tipo-bug", "area-backend", "area-frontend", "prioridad-alta")
        milestone = "M4 - Pulido y despliegue"
        status = "done"
        body = @"
## Contexto
Resolver desajustes en la conexion entre el frontend y el backend: CORS, rutas relativas, configuracion de la URL base del API segun entorno.

## Tareas
- [x] Configurar CORS en backend para los origenes esperados
- [x] Variable ``VITE_API_URL`` en frontend
- [x] Manejo de errores de red en cliente
- [x] Health check ``/api/health``
"@
    },

    @{
        title = "Refinamiento del diseno y arreglos visuales"
        labels = @("tipo-bug", "area-ui-ux", "area-frontend", "prioridad-media")
        milestone = "M4 - Pulido y despliegue"
        status = "done"
        body = @"
## Contexto
Iteracion de pulido sobre el diseno: visibilidad de elementos, contraste, espaciados, ajustes en plantillas y miembros de campana.

## Tareas
- [x] Arreglos de visibilidad en plantillas
- [x] Mejoras de diseno en perfil
- [x] Ajustes en miembros de campana y configuracion de cuentas
- [x] Limpieza de estilos inconsistentes
"@
    },

    @{
        title = "Responsive completo desde 320px hasta 4K"
        labels = @("tipo-feature", "area-ui-ux", "area-frontend", "prioridad-alta")
        milestone = "M4 - Pulido y despliegue"
        status = "done"
        body = @"
## Contexto
Asegurar que toda la app es usable desde moviles pequenos (320px) hasta pantallas 4K. Media queries centralizadas en ``_responsive.scss`` para que puedan sobrescribir cualquier regla anterior.

## Tareas
- [x] Auditoria de cada pagina en breakpoints clave
- [x] Ajustes especificos para movil en ``_responsive.scss``
- [x] Cargar ``_responsive.scss`` el ultimo en ``main.scss``
- [x] Pruebas manuales en dispositivos reales
"@
    },

    @{
        title = "Dockerizacion del frontend (multi-stage + nginx)"
        labels = @("tipo-infra", "area-despliegue", "prioridad-alta")
        milestone = "M4 - Pulido y despliegue"
        status = "done"
        body = @"
## Contexto
``frontend/Dockerfile`` multi-stage: build con Node, runtime con nginx alpine. ``nginx.conf`` sirve los estaticos y hace reverse proxy a ``/api`` y ``/socket.io``.

## Tareas
- [x] Dockerfile multi-stage
- [x] ``nginx.conf`` con proxy_pass y soporte WebSocket
- [x] ``.dockerignore`` para optimizar el contexto
- [x] Build local verificado
"@
    },

    @{
        title = "Dockerizacion del backend y docker-compose"
        labels = @("tipo-infra", "area-despliegue", "prioridad-alta")
        milestone = "M4 - Pulido y despliegue"
        status = "done"
        body = @"
## Contexto
``backend/Dockerfile`` basado en Node 20 alpine y ``docker-compose.yml`` que orquesta web + api + mongo con healthchecks.

## Tareas
- [x] Dockerfile del backend
- [x] ``docker-compose.yml`` con 3 servicios
- [x] Variables de entorno via ``.env.example``
- [x] Healthchecks de cada servicio
"@
    },

    @{
        title = "Despliegue en DigitalOcean App Platform"
        labels = @("tipo-infra", "area-despliegue", "prioridad-alta")
        milestone = "M4 - Pulido y despliegue"
        status = "done"
        body = @"
## Contexto
Desplegar la aplicacion en DigitalOcean App Platform con dominio gestionado en Name.com y HTTPS automatico (Let's Encrypt).

## Tareas
- [x] Spec ``.do/app.yaml``
- [x] Configurar variables de entorno en DO
- [x] Apuntar dominio Name.com a DO
- [x] Verificar HTTPS y dominio funcionando
- [x] Documentar el proceso en ``DEPLOYMENT.md``
"@
    },

    @{
        title = "CI/CD: workflows de GitHub Actions"
        labels = @("tipo-infra", "area-despliegue", "prioridad-media")
        milestone = "M4 - Pulido y despliegue"
        status = "done"
        body = @"
## Contexto
Pipelines de integracion y despliegue continuo:
- ``ci.yml`` en cada push/PR a ``main``: lint + tests backend, typecheck + build frontend.
- ``cd.yml`` en push a ``main``: build y push de imagenes a ghcr.io con tags ``:latest`` y ``:sha-<short>``.

## Tareas
- [x] ``.github/workflows/ci.yml``
- [x] ``.github/workflows/cd.yml``
- [x] Subida de artefactos de cobertura y build
- [x] Badges en README (opcional)
"@
    },

    @{
        title = "Documentacion completa del PFG (docs/)"
        labels = @("tipo-docs", "prioridad-media")
        milestone = "M4 - Pulido y despliegue"
        status = "done"
        body = @"
## Contexto
Redactar los 10 documentos del PFG en ``docs/`` segun la rubrica del modulo.

## Tareas
- [x] 01 Introduccion (origen, motivacion, objetivos)
- [x] 02 Descripcion (funcionalidades, UI/UX)
- [x] 03 Instalacion
- [x] 04 Guia de estilos
- [x] 05 Diseno (ER, casos de uso, arquitectura)
- [x] 06 Desarrollo (decisiones tecnicas)
- [x] 07 Pruebas
- [x] 08 Despliegue + 08-eval (rubrica)
- [x] 09 Manual de usuario
- [x] 10 Conclusiones
- [x] README principal
"@
    },

    # -------------------------------------------------------------------------
    # Backlog futuro (issues abiertos)
    # -------------------------------------------------------------------------

    @{
        title = "Notificaciones push para invitaciones y menciones"
        labels = @("tipo-feature", "prioridad-baja")
        milestone = "Backlog futuro"
        status = "todo"
        body = @"
## Contexto
Anadir notificaciones push (Web Push API) para avisar al usuario de nuevas invitaciones, anotaciones que le mencionan o eventos en sus campanas.

## Tareas
- [ ] Service Worker con suscripcion push
- [ ] Endpoint en backend para registrar suscriptores
- [ ] Disparo de notificaciones en eventos clave

## Notas
Pospuesto a una version posterior. Requiere VAPID keys y permisos del navegador.
"@
    },

    @{
        title = "Modo oscuro / claro conmutable"
        labels = @("tipo-feature", "area-ui-ux", "prioridad-baja")
        milestone = "Backlog futuro"
        status = "todo"
        body = @"
## Contexto
La paleta actual es la del prototipo Figma. Anadir un modo claro alternativo con un toggle accesible.

## Tareas
- [ ] Definir paleta clara en ``00-settings/colors``
- [ ] Toggle persistente en localStorage
- [ ] Auditoria de contraste WCAG AA
"@
    },

    @{
        title = "Exportar campana a PDF / JSON"
        labels = @("tipo-feature", "prioridad-baja")
        milestone = "Backlog futuro"
        status = "todo"
        body = @"
## Contexto
Permitir al DM exportar el estado completo de una campana a PDF (para imprimir) o JSON (para backup/import).

## Tareas
- [ ] Endpoint ``GET /api/campaigns/:id/export``
- [ ] Render a PDF (puppeteer o jsPDF)
- [ ] Import desde JSON con validacion
"@
    },

    @{
        title = "Tests E2E con Playwright"
        labels = @("tipo-chore", "area-frontend", "prioridad-baja")
        milestone = "Backlog futuro"
        status = "todo"
        body = @"
## Contexto
Anadir suite E2E con Playwright que cubra los flujos principales (login, crear campana, anadir capitulo, editar mapa).

## Tareas
- [ ] Configurar Playwright
- [ ] Tests de login y registro
- [ ] Tests de creacion y edicion de campana
- [ ] Integrar en ``ci.yml``
"@
    }
)

Write-Host "Definidos $($Global:Issues.Count) issues."
