# GUIÓN SPRINT REVIEW - BACKEND DNDPLANNER

## Introducción

Buenas, soy Alberto Rodríguez Oviedo y este es el segundo sprint review del proyecto de DnDPlanner. Y ahora voy a comentar un poco acerca de qué se ha añadido, qué hace cada cosa, qué estructura tiene el programa y algunos detalles concretos. También hablaré al final de vistas a futuro del proyecto
Este sprint se ha dedicado a completar el desarrollo del backend. Es básicamente una API REST construida con Node.js y Express y luego por otro lado utiliza MongoDB como base de datos, JWT para autenticación, Socket.IO para comunicación en tiempo real, y se integra con Cloudinary para imágenes y la API oficial de D&D 5e.

*(Ver stack completo en: `backend/package.json`, líneas 23-43)*

---

## Estructura del Proyecto

El backend sigue una arquitectura MVC organizada en carpetas dentro de `backend/src/`:

- **config/** → Configuraciones de base de datos, JWT y Cloudinary
- **controllers/** → Lógica de negocio de cada entidad
- **middlewares/** → Autenticación, errores y control de acceso
- **models/** → 6 esquemas de MongoDB (User, Campaign, Chapter, Event, Character, Map)
- **routes/** → Definición de los 46 endpoints de la API
- **services/** → Integración con D&D API y Cloudinary
- **validators/** → Validación de datos de entrada
- **server.js** → Punto de entrada de la aplicación

*(Ver estructura en: `backend/src/`)*

---

## Sistema de Autenticación

Luego, se ha implementado un sistema de autenticación completo con JWT de doble token: un access token de vida corta y un refresh token de vida larga. Las contraseñas se encriptan con bcrypt antes de guardarse.

El sistema incluye: registro, login, logout, renovación de tokens, obtener perfil, actualizar perfil, cambiar contraseña, eliminar cuenta cumpliendo con el Reglamente General de Potrección de Datos, y búsqueda de usuarios para compartir campañas.

*(Ver implementación en: `backend/src/controllers/auth.controller.js` y `backend/src/models/User.js`)*

---

## Modelos de Datos

He creado 6 modelos principales:

**Usuario** → Gestiona credenciales, avatar y tokens de sesión.
*(Ver: `backend/src/models/User.js`)*

**Campaña** → El modelo central. Incluye título, descripción, imagen de portada, sistema de compartición con roles DM/Player, tres niveles de visibilidad (privada, compartida, pública) y soporte para plantillas.
*(Ver: `backend/src/models/Campaign.js`)*

**Capítulo** → Organiza la narrativa de la campaña con orden manual y control de visibilidad para jugadores.
*(Ver: `backend/src/models/Chapter.js`)*

**Evento** → Representa las escenas dentro de un capítulo. Tiene 8 tipos: Misión, Combate, Historia Principal, Arco de Personaje, Exploración, Social, Descanso y Otros. Permite dos modos de edición: notas de texto o canvas visual con bloques arrastrables.
*(Ver: `backend/src/models/Event.js`)*

**Personaje** → Modelo completo de D&D con las 6 estadísticas, stats de combate, alineamiento, clase, raza, nivel, trasfondo, imagen y soporte para NPCs enlazados a la API de D&D.
*(Ver: `backend/src/models/Character.js`)*

**Mapa** → Sistema de mapas interactivos con grid configurable en cuadrados o hexágonos, 8 temas visuales, tokens para jugadores, NPCs y enemigos, y preparación para niebla de guerra.
*(Ver: `backend/src/models/Map.js`)*

---

## Control de Acceso RBAC (Role Based Access control)

Se ha implementado un sistema de permisos basado en roles con tres middlewares:

1. **campaignAccessMiddleware** → Verifica que el usuario tiene acceso a la campaña y determina su rol
2. **dmOnlyMiddleware** → Restringe acciones solo al Dungeon Master
3. **ownerOnlyMiddleware** → Restringe acciones solo al creador de la campaña

Esto permite que el DM vea y edite todo, los jugadores solo vean lo que el DM ha hecho visible, y solo el propietario pueda eliminar la campaña.

*(Ver: `backend/src/middlewares/rbac.js`)*

---

## Servicios Externos

**Integración con D&D 5e API** → Permite consultar monstruos, hechizos, equipamiento, clases, razas y condiciones directamente desde la API oficial. Incluye un sistema de caché en memoria de una hora para optimizar rendimiento.
*(Ver: `backend/src/services/dnd.service.js`)*

**Servicio de imágenes con Cloudinary** → Gestiona la subida de imágenes optimizadas: avatares de 200x200, imágenes de personaje de 500x700, y fondos de mapa hasta 4096x4096.
*(Ver: `backend/src/services/upload.service.js`)*

---

## Comunicación en Tiempo Real

Se ha configurado Socket.IO para que los cambios se sincronicen instantáneamente entre todos los jugadores. Cuando el DM mueve un token en el mapa o cambia la visibilidad de un capítulo, todos los conectados lo ven al momento.

Los eventos implementados son: unirse/salir de campaña, actualización de mapas, actualización de combate, y cambios de visibilidad.

*(Ver: `backend/src/server.js`, líneas 56-91)*

---

## Seguridad

El backend incluye múltiples capas de seguridad:

- **Helmet** para headers HTTP seguros
- **CORS** configurado con origen específico
- **Rate Limiting** de 100 peticiones cada 15 minutos
- **bcrypt** para hash de contraseñas
- **JWT** con doble token
- **Validación** con express-validator en todas las rutas

*(Ver: `backend/src/server.js`, líneas 27-47)*

---

## Despliegue

El proyecto está preparado para desplegarse en múltiples plataformas. Incluye un Dockerfile optimizado con Node 20 Alpine y healthcheck configurado, además de archivos de configuración para Railway y Render.

*(Ver: `backend/Dockerfile`, `backend/railway.toml`, `backend/render.yaml`)*

---

## Resumen

En total, el backend incluye:
- 6 modelos de datos interconectados
- 46 endpoints REST funcionales
- Sistema de autenticación con JWT
- Control de acceso basado en roles
- Comunicación en tiempo real
- Integración con servicios externos
- Preparado para producción

El backend está completo y listo para conectarse con el frontend.