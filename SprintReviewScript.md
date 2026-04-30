# Guión Sprint Review — Frontend DNDPlanner (Sprint Actual)

> Duración estimada: ~7 min · Ritmo ~150 palabras/minuto

---

## 1. Introducción (≈30 s)

Buenas. En este sprint review os voy a presentar la segunda gran iteración del **frontend de DNDPlanner**. Si en el sprint anterior dejé montada la navegación básica y las primeras pantallas, en este sprint he cerrado prácticamente toda la funcionalidad de la aplicación: el sistema de campañas completo, la ficha de personaje al estilo D&D, dos editores de canvas —uno de eventos y uno de mapa—, soporte multiidioma español e inglés, y un sistema de deshacer y rehacer global. Todo sigue con React + TypeScript + SCSS organizado en ITCSS y BEM.

---

## 2. Arquitectura: contextos y enrutado (≈45 s)

Lo primero es la base que sostiene todo. He añadido dos contextos globales que envuelven la aplicación en `App.tsx`.

El primero es `AuthContext`, que ahora **persiste la sesión en localStorage**: si el usuario cierra el navegador y vuelve, sigue logueado. La clave `dndplanner:user` se lee al montar y se escribe en cada cambio mediante un `useEffect`.

El segundo es `CampaignContext`, el contexto central de la app. Almacena todas las campañas del usuario y expone helpers CRUD: `createCampaign`, `updateCampaign`, `deleteCampaign`, y lo mismo para capítulos y personajes. Los datos se persisten en `localStorage` y, como respaldo, en una cookie de siete días —así si el usuario limpia el almacenamiento local, el borrador no desaparece.

En cuanto al enrutado, he añadido las rutas `/campaigns`, `/chapterOrCharacter`, `/chapter/:chapterId` y `/character/:characterId`, completando así la navegación de toda la app.

---

## 3. Plantillas de campaña (≈45 s)

Al crear una campaña nueva se abre el `NewCampaignModal`. El usuario escribe un nombre y elige una de cuatro **plantillas**: Blank, Destinos Cruzados, Campollano y Guerra. Cada plantilla tiene sus capítulos ya definidos, con nombre, descripción y eventos precargados. Esto significa que al seleccionar, por ejemplo, "Destinos Cruzados", la campaña se crea ya con toda su estructura narrativa lista para completar: el usuario no parte de cero, sino de un andamiaje que guía la creación de la aventura.

La lógica de las plantillas vive en `CampaignContext.tsx`, en el array `CAMPAIGN_TEMPLATES`, y se aplica dentro de `createCampaign` cuando se pasa un `templateId`.

---

## 4. Internacionalización y undo/redo (≈45 s)

He integrado **i18next** para que toda la interfaz esté disponible en español e inglés. El idioma elegido se guarda en `localStorage` con la clave `dndplanner:lang` y se restaura automáticamente al abrir la app. El botón de cambio de idioma está en el footer: alterna entre EN y ES con una sola pulsación.

El sistema de **deshacer y rehacer** es un hook personalizado, `useUndoableState`, que funciona como una pila de historial. Mantiene arrays `past`, `present` y `future` y responde a `Ctrl+Z` para deshacer y `Ctrl+Y` o `Ctrl+Shift+Z` para rehacer. Lo importante es que el atajo se ignora si el foco está en un input o textarea, para no interferir con la escritura normal. Este hook se usa en el selector de capítulos, en el canvas de eventos, en el de mapa y en la ficha de personaje.

---

## 5. Canvas de eventos (≈1 min 15 s)

La pantalla de capítulo tiene dos modos: **Eventos** y **Mapa**. Empiezo por eventos.

El canvas de eventos es un espacio de trabajo libre donde el Dungeon Master coloca bloques de texto y los conecta mediante flechas direccionales. La barra de herramientas tiene siete herramientas: seleccionar, mover el canvas, crear bloque, escribir texto, conectar bloques, zoom y modo notas. Todas están en la parte inferior de la pantalla, fijadas sobre el canvas.

Las conexiones se dibujan en SVG con marcadores `<marker>` para las puntas de flecha, y el punto final de cada línea se desplaza hacia el borde del bloque para que la punta no quede solapada. Al arrastrar un bloque, éste sube al frente reordenando el array —el último elemento del DOM se pinta encima— sin necesitar z-index explícito.

El **modo notas** recorre el grafo en profundidad desde los nodos raíz y asigna a cada bloque un número de escena. Los bloques que quedan fuera del camino principal se marcan como alternativos. El resultado es un guion numerado que el DM puede leer mientras dirige la sesión.

El zoom funciona tanto con la rueda del ratón como arrastrando verticalmente con la herramienta de zoom. En ambos casos el punto de zoom es el cursor: el canvas escala alrededor de donde apunta el ratón, no alrededor del centro.

---

## 6. Canvas de mapa (≈1 min 15 s)

El segundo modo es el editor de mapas. La cuadrícula es configurable: el DM elige número de columnas y filas, y al abrir el canvas el mapa se centra automáticamente en el viewport mediante un `useLayoutEffect`.

El zoom también está centrado en el cursor, usando la misma fórmula que en el canvas de eventos. El mapa tiene su propia barra de herramientas: seleccionar entidad, colocar jugador, NPC, enemigo u obstáculo, borrar, moverse por el canvas y hacer zoom.

El pintado es continuo: al mantener el botón pulsado y arrastrar se van colocando entidades celda a celda. El borrado funciona igual pero con el botón derecho del ratón. Además, al hacer doble clic sobre una entidad se abre un popup de estadísticas con campos editables de HP, armadura e iniciativa. Y al pasar el ratón por encima de una celda aparece un tooltip con el nombre de la entidad.

El canvas ocupa el 100% del espacio disponible de la pantalla, incluyendo soporte para pantalla completa mediante la Fullscreen API del navegador.

---

## 7. Ficha de personaje con API de D&D (≈1 min 15 s)

La ficha de personaje es la pantalla más densa. Cubre todos los campos estándar de D&D 5e: las seis estadísticas con sus modificadores calculados automáticamente, puntos de golpe, clase de armadura, iniciativa, velocidad, tiradas de salvación, competencias en habilidades, rasgos de personalidad, facciones, hechizos, inventario y descripción libre.

Lo más destacable es la integración con la **API pública de D&D 5e**. El selector de clase muestra las doce clases oficiales cargadas dinámicamente desde `dnd5eapi.co`. Al elegir una clase —por ejemplo, Mago— la ficha se autorellena: el dado de golpe pasa a ser d6, las tiradas de salvación se marcan como Inteligencia y Sabiduría, y se añaden las competencias iniciales de la clase. Todo eso viene de la API, no está hardcodeado. Los resultados se cachean en memoria para no repetir peticiones.

Si el DM quiere una clase personalizada o de homebrew, puede seleccionar la opción "Homebrew" del desplegable y escribir el nombre libremente.

La ficha también permite subir una imagen de retrato del personaje: se lee como `data:` URI con `FileReader` y se almacena en el contexto junto al resto de datos.

---

## 8. Cierre y próximos pasos (≈30 s)

En resumen, este sprint ha cerrado la capa de cliente con un sistema de datos persistente, edición completa de campañas, personajes y capítulos, dos editores de canvas, soporte multiidioma e integración con una API externa. Lo que queda para el próximo sprint es conectar el frontend con el backend real, sustituir el `localStorage` por llamadas a la API REST que ya está implementada, y ajustar los flujos de autenticación para usar los tokens JWT del servidor. ¿Preguntas?
