# DnDPlanner – Propuesta Formal del Proyecto

**Autor:** Alberto Rodríguez  
**Fecha:** Marzo 2026

---

## Índice

1. [Identificación de necesidades](#1-identificación-de-necesidades)
2. [Oportunidades de negocio](#2-oportunidades-de-negocio)
3. [Tipo de proyecto](#3-tipo-de-proyecto)
4. [Características específicas](#4-características-específicas)
5. [Obligaciones legales y prevención](#5-obligaciones-legales-y-prevención)
6. [Ayudas y subvenciones](#6-ayudas-y-subvenciones)
7. [Guión de trabajo](#7-guión-de-trabajo)
8. [Referencias](#8-referencias)

---

## 1. Identificación de necesidades

### Problema detectado

El problema que DnDPlanner busca resolver es la dificultad que tienen los Dungeon Masters (DMs) y jugadores de D&D o juegos de rol para organizar y gestionar sus campañas de forma eficiente.

Actualmente, muchos DMs dependen de unas combinaciones de herramientas un poco dispersas: Google Docs, hojas de cálculo (Google Sheets o Excel), papel y boli, Discord, etc. Esto provoca que la información se quede muy fragmentada, sea difícil de compartir con los otros jugadores y se pierdan detalles importantes entre sesión y sesión


### Cómo se ha detectado esta necesidad

Esta necesidad se ha identificado a partir de tanto la experiencia directa propia como DM y jugador de campañas de rol y a través de la observación de otros jugadores y DMs como lo son mis compañeros de rol u otros individuos en internet.

Al preparar y dirigir campañas, queda claro que llevar un seguimiento de mecánicas de combate, eventos narrativos, mapas y personajes al mismo tiempo es una tarea abrumadora, hasta el punto que se pueden llegar a olvidar cosas cruciales.

Además, al observar comunidades online de D&D (Reddit, foros especializados, grupos de Discord), se ve que esta es una queja recurrente entre DMs, especialmente los que dirigen campañas largas o con historias complejas.


### Usuarios objetivo

Los usuarios principales de DnDPlanner son:

- **Dungeon Masters (DMs):** Necesitan herramientas para planificar, organizar y dirigir campañas. Son los usuarios que más partido sacarían de la aplicación, ya que son quienes gestionan toda la información.
- **Jugadores de rol:** Necesitan un lugar donde consultar la información de la campaña, tomar notas, escribir teorías y ver el progreso de la historia. Actualmente dependen de lo que el DM les comparta manualmente.
- **Creadores de contenido de rol:** Personas que crean campañas para compartirlas con la comunidad y que necesitan una plataforma donde publicarlas de forma organizada.

---

## 2. Oportunidades de negocio

### Análisis de mercado

Existen varias soluciones similares en el mercado, siendo las más destacables:

- **World Anvil:** Es la más popular y proporciona herramientas como anotaciones de campañas, creadores de mapas y creadores de personajes. Sin embargo, su enfoque es más orientado al worldbuilding que a la gestión activa de campañas durante las sesiones.
- **D&D Beyond:** Plataforma oficial de D&D centrada en fichas de personajes y reglas, pero no ofrece herramientas de planificación de campañas como tal.
- **Notion/Google Docs:** Muchos DMs usan herramientas genéricas de notas, pero carecen de funcionalidades específicas para rol.
- **Roll20/Foundry VTT:** Orientadas a partidas online con tableros virtuales, pero no están pensadas para la organización de campañas presenciales ni para la planificación narrativa.

### Propuesta de valor diferencial

Lo que hace diferente a DnDPlanner frente a la competencia se resume en varias funcionalidades clave que otras aplicaciones no tienen:

- **Simulador de combate a tiempo real:** Permite al DM llevar un seguimiento en tiempo real de lo que sucede en combate. No se trata solo de anotar vida, sino de gestionar mecánicas complejas (estados, movimiento, acciones de rol, iniciativa…) que son fáciles de olvidar a lo largo de combates extensos. Esto aceleraría una de las partes más lentas del D&D.

- **Vista DM/Jugador con sistema de revelación:** El DM puede ocultar o mostrar información a los jugadores de forma granular, revelando secciones individualmente o capítulos enteros. Incluye funcionalidades como REDACTED para ocultar nombres o ciudades globalmente, algo extremadamente útil en campañas de misterio o simplemente para no revelar demasiada información a los jugadores antes de tiempo.

- **Anotaciones de jugadores:** Los jugadores pueden añadir sus propias notas y teorías a la campaña, cada uno con un color distinto. Esto es algo que World Anvil no tiene, y es esencial porque las campañas se hacen para los jugadores, y ver sus teorías funciona como feedback directo para el DM.

- **Visualizador de timeline y sistema de ramificaciones:** Permite ver los eventos en distintos órdenes (cronológico, de revelación, de eventos) y visualizar las decisiones tomadas por los jugadores y sus consecuencias.

### Potencial de la solución

El mercado de D&D y juegos de rol ha crecido enormemente en los últimos años, impulsado por la popularidad de series como **Stranger Things** y streamers de rol. La comunidad hispanoparlante de D&D está en pleno crecimiento y actualmente no existe ninguna herramienta similar enfocada en este público, de ahí que la aplicación vaya a incluir traducciones a español e inglés. DnDPlanner podría además escalar fácilmente a otros sistemas de rol más allá de D&D, ampliando su base de usuarios potenciales.

---

## 3. Tipo de proyecto

### Tipo de aplicación

DnDPlanner será una **SPA (Single Page Application)**, ya que este tipo de aplicación es el más adecuado para una herramienta interactiva que requiere actualizaciones en tiempo real y una experiencia de usuario fluida. Los usuarios necesitan interactuar constantemente con mapas, editores de eventos, simuladores de combate y timelines sin recargas de página que interrumpan el flujo de trabajo.

### Justificación

Una SPA es la elección ideal porque:

- La aplicación requiere una interacción constante y dinámica con los elementos de la interfaz (arrastrar bloques en mapas, editar eventos, simular combates).

- Los datos deben actualizarse en tiempo real cuando se comparte la campaña con otros usuarios.

- La experiencia de usuario es prioritaria, ya que los DMs necesitan herramientas que no les ralenticen durante las sesiones.

### Arquitectura propuesta

Se utilizará una arquitectura **cliente-servidor** con el stack **MERN** (MongoDB, Express, React, Node.js):

- **Frontend (Cliente):** React como framework principal, utilizando la metodología **ITCSS** para la organización del CSS. Se encargará de toda la interfaz de usuario: editores de mapas, timelines, simulador de combate, vistas de personajes, etc.
- **Backend (Servidor):** Node.js con Express para la API REST que gestione la lógica de negocio: autenticación, gestión de campañas, compartición entre usuarios, almacenamiento de datos, etc.
- **Base de datos:** MongoDB, ideal para este proyecto por su flexibilidad con documentos no estructurados, ya que las campañas pueden tener estructuras muy variadas (capítulos, eventos, mapas, personajes, notas).
- **APIs externas:** Se integrará con la API pública de enemigos y criaturas de D&D para el simulador de combate.

---

## 4. Características específicas

### Funcionalidades del MVP (Producto Mínimo Viable)

**Obligatorias:**

1. **Sistema de autenticación:** Login/Register para que los usuarios puedan guardar y gestionar sus campañas.
2. **Creador de campañas:** Crear campañas desde cero o a partir de templates de campañas predeterminadas sin copyright.
3. **Creador de capítulos:** Dentro de cada campaña, crear capítulos nuevos desde cero o a partir de uno existente.
4. **Creador de eventos:** Dos modos de creación: escritura de notas tradicionales (separando eventos por párrafos) o creación visual tipo Canva. Se podrá seleccionar el tipo de evento (Misión, Combate, Historia Principal, Arco de Personaje, etc.).
5. **Creador de mapas:** Tablero infinito con casillas configurables (tamaño, forma, ambientación). El usuario puede posicionar bloques representando jugadores, NPCs, terreno, objetos y enemigos.
6. **Creador de personajes:** Crear personajes con estadísticas, clases e imagen representativa. Incluye un mini "Picrew" para customizar personajes a partir de parámetros visuales.
7. **Sistema de compartición:** Compartir campañas con otros usuarios e invitar jugadores.
8. **Vista DM/Jugador:** El DM puede ocultar/mostrar información a los jugadores de forma granular.

**Opcionales (post-MVP):**

1. **Simulador de combate a tiempo real:** Gestión completa de mecánicas de combate con seguimiento de vida, estados, movimiento y acciones de rol.
2. **Visualizador de timeline:** Ver eventos en orden cronológico, de revelación o de sucesión.
3. **Sistema de ramificaciones:** Diagrama visual de decisiones tomadas y sus consecuencias.
4. **Estado del mundo:** Página que muestra facciones, líderes y relaciones entre personajes importantes.
5. **Sistema REDACTED:** Ocultar información globalmente en todo el documento (nombres, ciudades, etc.).
6. **Anotaciones de jugadores:** Los jugadores pueden añadir notas y teorías con colores distintivos.
7. **Importador y exportador:** Importar/exportar mapas, eventos, capítulos y personajes.
8. **Post-its en mapas:** Notas adhesivas para apuntar información adicional directamente sobre los mapas.

### Requisitos técnicos

- **Stack MERN:** MongoDB, Express, React, Node.js
- **Metodología CSS:** ITCSS
- **API externa:** API pública de criaturas y enemigos de D&D
- **Tiempo real:** WebSockets o similar para la compartición en tiempo real entre DM y jugadores
- **Almacenamiento de imágenes:** Para mapas, personajes e imágenes importadas por los usuarios

---

## 5. Obligaciones legales y prevención

### Normativa aplicable

- **RGPD (Reglamento General de Protección de Datos):** Al gestionar datos personales de los usuarios (correo electrónico, nombre de usuario, datos de perfil), es obligatorio cumplir con el RGPD. Esto incluye informar al usuario sobre qué datos se recogen, con qué finalidad y obtener su consentimiento explícito.
- **LSSI-CE (Ley de Servicios de la Sociedad de la Información y Comercio Electrónico):** Al ser un servicio web, es necesario incluir un aviso legal con la información del responsable, así como una política de cookies si se utilizan cookies de seguimiento.
- **Propiedad intelectual:** Las campañas predeterminadas incluidas deben ser libres de copyright. No se podrá incluir contenido oficial de Wizards of the Coast protegido por derechos de autor. Se utilizará únicamente contenido bajo la licencia OGL (Open Game License) o SRD (System Reference Document).

### Medidas de seguridad y protección de datos

- **Autenticación segura:** Uso de hashing para contraseñas (bcrypt), tokens JWT para sesiones y HTTPS obligatorio.
- **Cifrado de datos sensibles:** Los datos personales se almacenarán cifrados en la base de datos.
- **Política de privacidad:** Se implementará una página de política de privacidad detallando el tratamiento de datos.
- **Derecho al olvido:** Los usuarios podrán eliminar su cuenta y todos los datos asociados en cualquier momento.
- **Copias de seguridad:** Se realizarán copias de seguridad periódicas de la base de datos para evitar pérdida de información.

### Accesibilidad web (WCAG)

- Se seguirán las pautas **WCAG 2.1** de nivel AA como mínimo.
- Contraste adecuado entre texto y fondo, navegación por teclado, textos alternativos en imágenes y etiquetas ARIA donde sea necesario.
- Se prestará especial atención a la accesibilidad en los editores de mapas y timelines, ya que son componentes altamente visuales.

---

## 6. Ayudas y subvenciones

### Ayudas disponibles

- **Kit Digital:** Programa de ayudas del Gobierno de España para la digitalización de pymes y autónomos. Podría aplicarse si DnDPlanner se constituye como una actividad económica, cubriendo gastos de desarrollo web, hosting y marketing digital.
- **ENISA (Empresa Nacional de Innovación):** Ofrece préstamos participativos para jóvenes emprendedores. Aplicable si el proyecto se convierte en una startup con modelo de negocio definido.
- **Ayudas autonómicas:** Dependiendo de la comunidad autónoma, existen subvenciones específicas para proyectos tecnológicos y emprendimiento joven.

### Aplicabilidad al proyecto

Actualmente, al tratarse de un proyecto académico, no se acogería directamente a estas ayudas. Sin embargo, si el proyecto evoluciona a un producto comercial, las ayudas de Kit Digital y ENISA serían las más relevantes.

### Recursos gratuitos o de bajo coste

- **MongoDB Atlas:** Tier gratuito para la base de datos (512 MB).
- **Render / Railway:** Hosting gratuito para el backend con planes free tier.
- **Netlify / Vercel:** Hosting gratuito para el frontend SPA.
- **GitHub:** Repositorio y gestión de proyecto con GitHub Projects (gratuito).
- **API de D&D 5e (dnd5eapi.co):** API pública y gratuita para datos de criaturas, hechizos y objetos.
- **Cloudinary:** Tier gratuito para almacenamiento y gestión de imágenes.
- **Figma:** Plan gratuito para diseño de mockups y prototipos.

---

## 7. Guión de trabajo

### Fases principales

| Fase | Descripción |
|------|-------------|
| **Fase 1 – Planificación** | Definición de requisitos, diseño de la arquitectura, wireframes y mockups. Configuración del entorno de desarrollo. |
| **Fase 2 – Backend base** | Implementación de la API REST: autenticación, CRUD de campañas, capítulos y personajes. Configuración de la base de datos. |
| **Fase 3 – Frontend base** | Desarrollo de la interfaz principal: sistema de login, dashboard de campañas, navegación general. Aplicación de ITCSS. |
| **Fase 4 – Funcionalidades core** | Creador de eventos (notas y Canva), creador de mapas (tablero con bloques), creador de personajes (stats, clase, imagen). |
| **Fase 5 – Compartición y vistas** | Sistema de compartición de campañas, vista DM/Jugador con revelación de información. |
| **Fase 6 – Funcionalidades avanzadas** | Simulador de combate, timeline, ramificaciones, estado del mundo, sistema REDACTED. |
| **Fase 7 – Testing y despliegue** | Pruebas, corrección de bugs, optimización y despliegue en producción. |

### Hitos y entregas intermedias

| Hito | Entrega |
|------|---------|
| **Hito 1** | Maqueta funcional con navegación y diseño base (frontend). |
| **Hito 2** | API funcional con autenticación y CRUD de campañas (backend). |
| **Hito 3** | Integración frontend-backend: creación y visualización de campañas completa. |
| **Hito 4** | Creadores funcionales (eventos, mapas, personajes). |
| **Hito 5** | Sistema de compartición y vistas DM/Jugador. |
| **Hito 6** | Funcionalidades avanzadas implementadas (simulador, timeline, ramificaciones). |
| **Hito 7** | Aplicación desplegada en producción con testing completado. |

### Herramientas de gestión

- **GitHub Projects:** Para la gestión de tareas mediante tablero Kanban, siguiendo una metodología ágil inspirada en SCRUM con sprints semanales.
- **GitHub Issues:** Para el seguimiento de bugs y tareas específicas.
- **Toggl Track:** Para el registro de horas dedicadas a cada tarea y fase del proyecto.
- **Discord:** Para la comunicación del equipo en caso de trabajo colaborativo con jugadores de prueba.

---

## 8. Referencias

- [World Anvil](https://www.worldanvil.com/) – Plataforma de worldbuilding y gestión de campañas.
- [D&D Beyond](https://www.dndbeyond.com/) – Plataforma oficial de D&D para fichas y reglas.
- [Roll20](https://roll20.net/) – Tablero virtual para partidas online.
- [Foundry VTT](https://foundryvtt.com/) – Virtual tabletop para partidas de rol.
- [D&D 5e API](https://www.dnd5eapi.co/) – API pública con datos del SRD de D&D 5e.
- [MongoDB Atlas](https://www.mongodb.com/atlas) – Base de datos en la nube.
- [RGPD – Reglamento General de Protección de Datos](https://www.boe.es/doue/2016/119/L00001-00088.pdf)
- [LSSI-CE](https://www.boe.es/buscar/act.php?id=BOE-A-2002-13758) – Ley de Servicios de la Sociedad de la Información.
- [WCAG 2.1](https://www.w3.org/TR/WCAG21/) – Pautas de Accesibilidad para el Contenido Web.
- [Kit Digital](https://www.acelerapyme.gob.es/kit-digital) – Programa de ayudas a la digitalización.
- [ENISA](https://www.enisa.es/) – Empresa Nacional de Innovación.
- [OGL – Open Game License](https://opengamingfoundation.org/ogl.html) – Licencia abierta para contenido de juegos de rol.
