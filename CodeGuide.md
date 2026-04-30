# Guía de código — DNDPlanner Frontend

Referencia rápida de dónde encontrar cada funcionalidad en el código.

---

## Enrutado y estructura de la app

| Qué | Dónde |
|-----|-------|
| Todas las rutas (`/`, `/main`, `/profile`, `/campaigns`, `/chapterOrCharacter`, `/chapterSelector`, `/characterSelector`, `/chapter/:id`, `/character/:id`) | `frontend/src/App.tsx` — dentro del `<Routes>` |
| Proveedores globales (`CampaignProvider`, `AuthProvider`, `BrowserRouter`) | `frontend/src/App.tsx` — wrapping del árbol |
| Punto de entrada (imports de i18n y SCSS) | `frontend/src/main.tsx` |

---

## Contextos globales

| Qué | Dónde |
|-----|-------|
| Estado de sesión (usuario logueado / deslogueado) | `frontend/src/context/AuthContext.tsx` |
| Persistencia de sesión en localStorage (`dndplanner:user`) | `AuthContext.tsx` — `useEffect` sobre `user` |
| Campañas, capítulos y personajes del usuario | `frontend/src/context/CampaignContext.tsx` |
| CRUD de campañas (`createCampaign`, `updateCampaign`, `deleteCampaign`) | `CampaignContext.tsx` |
| CRUD de capítulos (`addChapter`, `updateChapter`, `deleteChapter`) | `CampaignContext.tsx` |
| CRUD de personajes (`addCharacter`, `updateCharacter`, `deleteCharacter`) | `CampaignContext.tsx` |
| Persistencia de campañas en localStorage + cookie 7 días | `CampaignContext.tsx` — `useEffect` sobre `campaigns` |
| Plantillas de campaña (`CAMPAIGN_TEMPLATES`) | `CampaignContext.tsx` — array exportado |
| Helper `abilityModifier(score)` | `CampaignContext.tsx` — función exportada |

---

## Hooks personalizados

| Qué | Dónde |
|-----|-------|
| Undo/redo con historial (`past[]`, `present`, `future[]`) | `frontend/src/hooks/useUndoableState.ts` |
| Atajos de teclado Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z | `useUndoableState.ts` — `window.addEventListener('keydown', ...)` |
| Lista de clases D&D 5e desde la API (`classes[]`, `loading`, `error`) | `frontend/src/hooks/useDndClasses.ts` |
| Detalle de clase con caché en memoria (`fetchClassDetail(index)`) | `useDndClasses.ts` — función devuelta por el hook |

---

## Internacionalización (i18n)

| Qué | Dónde |
|-----|-------|
| Configuración de i18next (idioma inicial, fallback, detector) | `frontend/src/i18n/index.ts` |
| Persistencia del idioma en localStorage (`dndplanner:lang`) | `i18n/index.ts` — listener `languageChanged` |
| Traducciones en inglés | `frontend/src/i18n/locales/en.json` |
| Traducciones en español | `frontend/src/i18n/locales/es.json` |
| Botón de cambio de idioma (EN ↔ ES) | `frontend/src/components/layout/Footer/Footer.tsx` |

---

## Páginas

| Página | Archivo |
|--------|---------|
| Landing (`/main`) — vista logueada y deslogueada | `frontend/src/pages/MainPage.tsx` |
| Perfil del usuario (`/profile`) | `frontend/src/pages/ProfilePage.tsx` |
| Lista completa de campañas (`/campaigns`) | `frontend/src/pages/CampaignsPage.tsx` |
| Selector capítulo o personaje (`/chapterOrCharacter`) | `frontend/src/pages/ChapterOrCharacterPage.tsx` |
| Lista de capítulos con edición inline (`/chapterSelector`) | `frontend/src/pages/ChapterSelectorPage.tsx` |
| Lista de personajes con búsqueda (`/characterSelector`) | `frontend/src/pages/CharacterSelectorPage.tsx` |
| Editor de capítulo — tabs Eventos y Mapa (`/chapter/:id`) | `frontend/src/pages/ChapterPage/ChapterPage.tsx` |
| Canvas de eventos (bloques, conexiones, notas) | `frontend/src/pages/ChapterPage/EventsCanvas.tsx` |
| Canvas de mapa (cuadrícula, entidades, stats) | `frontend/src/pages/ChapterPage/MapCanvas.tsx` |
| Ficha de personaje D&D 5e (`/character/:id`) | `frontend/src/pages/CharacterSheetPage.tsx` |

---

## Componentes compartidos

| Componente | Archivo |
|-----------|---------|
| Modal de autenticación (registro / login) | `frontend/src/components/shared/AuthModal/AuthModal.tsx` |
| Modal para crear campaña (nombre + plantilla) | `frontend/src/components/shared/NewCampaignModal/NewCampaignModal.tsx` |
| Modal de confirmación genérico | `frontend/src/components/shared/ConfirmModal/ConfirmModal.tsx` |
| Tarjeta de campaña con hover image-swap | `frontend/src/components/shared/CampaignCard/CampaignCard.tsx` |
| Tarjeta "+" para crear nueva campaña | `frontend/src/components/shared/CampaignCard/CreateCampaignCard.tsx` |
| Header global | `frontend/src/components/layout/Header/Header.tsx` |
| Footer con cambio de idioma | `frontend/src/components/layout/Footer/Footer.tsx` |

---

## Canvas de eventos — detalles técnicos

| Qué | Dónde |
|-----|-------|
| Estado con undo/redo (`blocks[]`, `connections[]`) | `EventsCanvas.tsx` — `useUndoableState<CanvasState>` |
| Definición del marcador SVG para flechas | `EventsCanvas.tsx` — `<defs><marker id="events-arrow">` |
| Lógica "bringToFront" (z-order por posición en array) | `EventsCanvas.tsx` — función `bringToFront` |
| Drag de bloque con Pointer Capture API | `EventsCanvas.tsx` — `dragRef`, `onPointerDown` en bloque |
| Pan del canvas (herramienta mano) | `EventsCanvas.tsx` — `dragRef.current = { kind: 'pan', ... }` |
| Zoom vertical con arrastre | `EventsCanvas.tsx` — `dragRef.current = { kind: 'zoom', ... }` |
| Zoom con rueda del ratón centrado en cursor | `EventsCanvas.tsx` — `onWheel` → `applyZoomAtPoint` |
| Modo notas (numeración DFS desde nodos raíz) | `EventsCanvas.tsx` — función `buildNotesOrder` |

---

## Canvas de mapa — detalles técnicos

| Qué | Dónde |
|-----|-------|
| Estado con undo/redo (`cells`, `cols`, `rows`) | `MapCanvas.tsx` — `useUndoableState<MapState>` |
| Centrado inicial del grid en el viewport | `MapCanvas.tsx` — `useLayoutEffect` con `didInitialCenterRef` |
| Fórmula zoom centrado en cursor | `MapCanvas.tsx` — función `applyZoomAtPoint` |
| Pintado continuo de entidades (click + drag) | `MapCanvas.tsx` — `paintingRef`, `onPointerEnter` |
| Borrado con botón derecho + drag | `MapCanvas.tsx` — `erasingRef`, `event.button === 2` |
| Popup de estadísticas al doble clic | `MapCanvas.tsx` — componente `StatsPopup` inline |
| Tooltip de nombre en hover | `MapCanvas.tsx` — estado `hovered`, posición `clientX - rect.left` |
| Pantalla completa (Fullscreen API) | `ChapterPage.tsx` — `folderRef.current.requestFullscreen()` |

---

## Ficha de personaje — detalles técnicos

| Qué | Dónde |
|-----|-------|
| Estado completo con undo/redo | `CharacterSheetPage.tsx` — `useUndoableState<Character \| null>` |
| Dropdown de clases D&D (desde API) | `CharacterSheetPage.tsx` — `useDndClasses()` |
| Autorelleno al seleccionar clase (`hitDie`, `savingThrows`) | `CharacterSheetPage.tsx` — `handleClassChange` → `fetchClassDetail` |
| Opción Homebrew (input libre) | `CharacterSheetPage.tsx` — `classMode === 'homebrew'` |
| Subida de imagen de retrato (FileReader → data URI) | `CharacterSheetPage.tsx` — `handlePortraitChange` |
| Guardado en contexto + navegación | `CharacterSheetPage.tsx` — `handleSave` → `updateCharacter` → `navigate(-1)` |
| Cálculo de modificador de habilidad | `CampaignContext.tsx` — `abilityModifier(score)` |

---

## SCSS — componentes clave

| Componente | Archivo SCSS |
|-----------|-------------|
| Tarjeta de campaña (hover, outline rosa, variante `--plus`) | `frontend/src/styles/05-components/_campaign-card.scss` |
| Layout completo del capítulo (folder, tabs, canvas, toolbar) | `frontend/src/styles/05-components/_chapter-page.scss` |
| Lista de capítulos (filas, edición inline, vacío) | `frontend/src/styles/05-components/_chapter-selector.scss` |
| Selector de personajes (folder + búsqueda) | `frontend/src/styles/05-components/_character-selector.scss` |
| Ficha de personaje (stats, traits, listas, descripción) | `frontend/src/styles/05-components/_character-sheet.scss` |
| Página de campañas | `frontend/src/styles/05-components/_campaigns-page.scss` |
| Modal nueva campaña | `frontend/src/styles/05-components/_new-campaign-modal.scss` |
| Selector capítulo o personaje | `frontend/src/styles/05-components/_chapter-or-character.scss` |
| Botones globales (tamaño, grosor, peso) | `frontend/src/styles/05-components/_button.scss` |
| Variables tipográficas (incluye `--font-size-xs`) | `frontend/src/styles/00-settings/_typography.scss` |
| Registro de todos los parciales SCSS | `frontend/src/styles/main.scss` |
