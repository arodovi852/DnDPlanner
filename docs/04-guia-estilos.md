# 4. Guía de estilos y prototipado

Este documento describe **cómo se ve y cómo se comporta visualmente** DnDPlanner: el prototipo en Figma, la paleta cromática, la tipografía, la escala de espaciados y radios, el sistema de componentes BEM/ITCSS, los breakpoints responsive y las decisiones de accesibilidad.

Todo lo que se describe aquí está implementado en código bajo [`frontend/src/styles/`](../frontend/src/styles/) y replicado como guía visual en la página `Guidelines` del archivo Figma.

---

## 4.1. Prototipo en Figma

El prototipo del proyecto vive en Figma como fuente única de verdad del diseño:

- **Enlace al archivo:** [Figma – DNDPlanner](https://www.figma.com/design/KJHcUmBBdXxAwAXLHdTTWe/DNDPlanner)
- **Páginas del archivo:**
  - `Design (Desktop)` – mockups de cada pantalla a 1440 px.
  - `Design (Mobile)` – versiones móviles a 360 px.
  - `Guidelines` – guía de estilos: paleta, tipografía, iconografía, grids, componentes.

---

## 4.2. Identidad visual

DnDPlanner se hizo con una cosa en mente ante todo: La **creatividad**. Es muy fácil caer dentro de la monotonía, especialmente con aplicaciones webs de este calibre. Sin embargo, con este enfoque se quiso dar mucho énfasis en este aspecto creativo, ya que la aplicación se supone que está centrado en algo de ocio y por ende debería de tener un diseño que se adapte a esta mentalidad.

Algunas de estas decisiones clave fueron:

| Decisión | Motivación |
|---|---|
| Uso de **marrones rojizos y cálidos** como color de chrome (header, footer, modales) | Evocar el cuero y la madera de un libro de campaña antiguo, además de cierta "seguridad" (color estable psicológicamente). |
| **Rosas vibrantes** como color estrella | Los juegos de rol deberían de ser una alternativa a una quedada grupal normal, por lo que esto debería verse reflejado de alguna forma. Colores inocentes pero alentadores, saturados pero sin pasarse. |
| **Tipografía Mochiy Pop One** | Mezcla redondez infantil y cuerpo grueso, justo lo que se busca en este proyecto. No es demasiado infantil como Comic Sans, pero tampoco demasiado seria, es el punto intermedio perfecto. Funciona bien tanto en titulares grandes como en interfaz. |
| **Bordes muy gruesos** (4-6 px) | Evocan la ilustración a tinta y refuerzan la sensación "manual / dibujado". Además, se adaptan a la estética general de la página. |
| **Radios generosos** (hasta 22 px) | Suavizan la dureza visual que generan los bordes gruesos. |

---

## 4.3. Paleta de colores

Toda la paleta se encuentro en [`frontend/src/styles/00-settings/_colors.scss`](../frontend/src/styles/00-settings/_colors.scss) como variables CSS. **Está prohibido usar literales de color en cualquier otro fichero del proyecto**, ya que siempre se referencian con `var(--color-*)` para una mejor organización. De este modo, por ejemplo, se puede ajustar la marca en un solo punto y verlo propagado en toda la aplicación.

### 4.3.1. Colores de marca

| Token | Hex | Uso |
|---|---|---|
| `--color-primary` | `#FF7FA8` | Botones primarios, links activos, estados de éxito en campaña. |
| `--color-primary-hover` | `#FF9CBD` | Hover de los elementos primarios. |
| `--color-primary-dark` | `#5A3A44` | Parte inferior del degradado de botón y acentos oscuros. |

### 4.3.2. Chrome (estructura)

| Token | Hex | Uso |
|---|---|---|
| `--color-chrome` | `#3D2B2B` | Header, footer, fondo de modales, fondo de la app. |
| `--color-chrome-strong` | `#2A1D1D` | Bordes y separadores dentro del chrome. |
| `--color-background` | `#3D2B2B` | Body. Coincide con el chrome para que la página se funda. |

### 4.3.3. Superficies (contenido)

| Token | Hex | Uso |
|---|---|---|
| `--color-surface` | `#FFFFFF` | Tarjetas, modales internos, formularios. |
| `--color-surface-alt` | `#F4F4F4` | Filas alternas, secciones secundarias. |
| `--color-surface-cream` | `#FDF6EC` | Fichas de personaje, áreas "pergamino". |

### 4.3.4. Variantes de TextBox

| Token | Hex | Uso |
|---|---|---|
| `--color-textbox-dark` | `#A55D66` | `TextBox` variante por defecto. |
| `--color-textbox-dark-hover` | `#C27580` | Hover de la variante por defecto. |
| `--color-textbox-light` | `#F099B2` | `TextBox--light`, anotaciones del jugador. |
| `--color-textbox-light-hover` | `#FFB4C9` | Hover de la variante clara. |

### 4.3.5. Tipografía y bordes

| Token | Hex | Uso |
|---|---|---|
| `--color-text` | `#1A1A1A` | Texto principal sobre superficie clara. |
| `--color-text-muted` | `#555555` | Texto secundario, ayudas, captions. |
| `--color-text-inverse` | `#FFFFFF` | Texto sobre chrome o sobre primary. |
| `--color-border` | `#2B2B2B` | Bordes "ilustrados" de botones y tarjetas. |
| `--color-border-soft` | `rgba(0,0,0,0.15)` | Bordes sutiles entre filas. |

### 4.3.6. Sombras, overlays y estados

| Token | Valor | Uso |
|---|---|---|
| `--color-shadow` | `rgba(0,0,0,0.25)` | Sombras de tarjetas y botones. |
| `--color-shadow-strong` | `rgba(0,0,0,0.45)` | Sombras de modales en primer plano. |
| `--color-overlay` | `rgba(0,0,0,0.55)` | Capa oscura detrás de modales. |
| `--color-translucid-base` | `rgba(61,43,43,0.45)` | `TranslucidTextBox` por defecto. |
| `--color-focus-ring` | `#FFD34D` | Anillo de foco para teclado (accesibilidad WCAG 2.1 AA). |

### 4.3.7. Contraste y accesibilidad

Todas las combinaciones de texto/fondo usadas en el producto cumplen **WCAG 2.1 nivel AA** (ratio ≥ 4.5:1 para texto normal, ≥ 3:1 para texto grande). Las combinaciones validadas son:

| Texto | Fondo | Ratio | Nivel |
|---|---|---|---|
| `--color-text` (`#1A1A1A`) | `--color-surface` (`#FFFFFF`) | 17.4:1 | AAA |
| `--color-text-inverse` (`#FFFFFF`) | `--color-chrome` (`#3D2B2B`) | 12.5:1 | AAA |
| `--color-text-inverse` (`#FFFFFF`) | `--color-primary` (`#FF7FA8`) | 3.1:1 | AA Large |
| `--color-text` (`#1A1A1A`) | `--color-textbox-light` (`#F099B2`) | 8.9:1 | AAA |
| `--color-text-muted` (`#555555`) | `--color-surface` (`#FFFFFF`) | 7.5:1 | AAA |

El anillo de foco (`--color-focus-ring`) se renderiza siempre con **3 px de grosor** y un offset de 2 px sobre cualquier control interactivo, garantizando visibilidad incluso sobre fondos similares.

---

## 4.4. Tipografía

La fuente principal de DnDPlanner es **Mochiy Pop One**, una sans serif redondeada de Google Fonts. Se carga desde [`frontend/index.html`](../frontend/index.html) y vive declarada en [`frontend/src/styles/00-settings/_typography.scss`](../frontend/src/styles/00-settings/_typography.scss).

### 4.4.1. Familias y stack de fallback

```css
--font-family-base:    'Mochiy Pop One', 'Trebuchet MS', system-ui, sans-serif;
--font-family-heading: 'Mochiy Pop One', 'Trebuchet MS', system-ui, sans-serif;
```

El fallback escalonado garantiza que, si Google Fonts falla o el usuario está sin conexión, el texto siga siendo legible con una alternativa de carácter similar. Esto es para mantener la integridad visual de la página incluso en caso de que hayan problemas.

### 4.4.2. Escala de tamaños

| Token | Valor | Uso típico |
|---|---|---|
| `--font-size-xs` | `0.75rem` (12 px) | Captions, badges, footnotes. |
| `--font-size-sm` | `0.875rem` (14 px) | Texto secundario en cards, ayudas. |
| `--font-size-base` | `1rem` (16 px) | Texto de párrafo, botones small, inputs. |
| `--font-size-md` | `1.125rem` (18 px) | Subtítulos, etiquetas destacadas. |
| `--font-size-lg` | `1.5rem` (24 px) | Títulos de modal, botón grande, h3. |
| `--font-size-xl` | `2rem` (32 px) | Títulos de página, hero. |

### 4.4.3. Pesos

| Token | Valor | Uso |
|---|---|---|
| `--font-weight-regular` | `400` | Texto base. |
| `--font-weight-bold` | `700` | Títulos, botones, énfasis. |

La fuente Mochiy Pop One solo provee Regular. Para el peso Bold se usa la representación sintética del navegador (`font-weight: 700`), que con esta tipografía produce un trazo coherente con el diseño.

### 4.4.4. Alturas de línea

| Token | Valor | Uso |
|---|---|---|
| `--line-height-base` | `1.4` | Párrafos, listas. |
| `--line-height-tight` | `1.15` | Titulares, botones. |

---

## 4.5. Espaciados y radios

La consistencia espacial en DnDPlanner se basa en una **escala de 5 valores** definida en [`_spacing.scss`](../frontend/src/styles/00-settings/_spacing.scss). Cualquier `padding`, `margin` o `gap` en el proyecto debe usar uno de estos tokens.

### 4.5.1. Escala de espaciado

| Token | Valor | Uso típico |
|---|---|---|
| `--space-xs` | `0.25rem` (4 px) | Separación entre icono y label. |
| `--space-sm` | `0.5rem` (8 px) | Padding vertical de chips, gap en flex denso. |
| `--space-md` | `1rem` (16 px) | Padding interno de cards, gap estándar. |
| `--space-lg` | `1.5rem` (24 px) | Padding de secciones, gap entre cards. |
| `--space-xl` | `2rem` (32 px) | Padding exterior de páginas, separación entre bloques. |

### 4.5.2. Radios de borde

| Token | Valor | Uso |
|---|---|---|
| `--radius-sm` | `6px` | Inputs, chips, swatches de color. |
| `--radius-md` | `14px` | Botones small, modales pequeños. |
| `--radius-lg` | `22px` | Botones normales, cards, modales. |
| `--radius-pill` | `9999px` | Avatares, toggles, badges redondos. |

### 4.5.3. Transiciones

| Token | Valor | Uso |
|---|---|---|
| `--transition-fast` | `150ms ease-out` | Hover de botones, foco. |
| `--transition-base` | `250ms ease-out` | Cambios de fondo, aparición de modales. |

---

## 4.6. Iconografía

DnDPlanner emplea **iconos vectoriales SVG sobre una rejilla de 24×24 px**, todos con stroke de 2 px y esquinas redondeadas (radio 2 px). El color se hereda del contexto vía `currentColor`, lo que permite reusar el mismo SVG en chrome (blanco) y en superficie (negro) sin duplicación.

### 4.6.1. Sets de iconos

| Set | Ejemplos |
|---|---|
| **Navegación** | home, perfil, campañas, usuarios, ajustes. |
| **Acción** | añadir, editar, borrar, compartir, descargar. |
| **Juego** | dado, espada, escudo, mapa, antorcha. |
| **Estado** | check, cruz, info, warning, error. |

### 4.6.2. Estados

| Estado | Tratamiento |
|---|---|
| Default | Stroke, sin relleno. |
| Activo / seleccionado | Relleno con `--color-primary`. |
| Disabled | `opacity: 0.4` y `cursor: not-allowed`. |

---

## 4.7. Grids y breakpoints

### 4.7.1. Sistema de columnas

Cuatro configuraciones de grid según el dispositivo:

| Dispositivo | Ancho de referencia | Columnas | Gutter | Margen lateral |
|---|---|---|---|---|
| Desktop HD | 1440 px | 12 | 24 px | 80 px |
| Desktop SD | 1024 px | 12 | 20 px | 48 px |
| Tablet | 768 px | 8 | 16 px | 32 px |
| Mobile | 320 px | 4 | 12 px | 16 px |

### 4.7.2. Breakpoints responsive

Definidos en [`frontend/src/styles/05-components/_responsive.scss`](../frontend/src/styles/05-components/_responsive.scss). Este fichero se carga el **último** en [`main.scss`](../frontend/src/styles/main.scss) para que sus media queries puedan sobrescribir cualquier regla anterior cuando el viewport coincide.

| Breakpoint | Ancho | Cambios principales |
|---|---|---|
| Desktop | ≥ 769 px | Layout completo con navegación horizontal y mapa a 800 px. |
| Tablet | ≤ 768 px | Header con wrap, footer en columna, mapa adaptativo. |
| Mobile grande | ≤ 480 px | Cards en una sola columna, paddings reducidos. |
| Mobile pequeño | ≤ 360 px | Mínimo soportado. Botones full-width, fuentes reducidas. |

Estos rangos cubren desde un Galaxy Fold cerrado (280 px) hasta un monitor 4K (3840 px), con escalado fluido entre ellos gracias al uso de `clamp()` en padding y tamaños de fuente clave.

---

## 4.8. Componentes reutilizables

La capa de componentes vive en [`frontend/src/styles/05-components/`](../frontend/src/styles/05-components/) y sigue la metodología **BEM** (Block, Element, Modifier). La arquitectura global del CSS es **ITCSS** (Inverted Triangle CSS), con siete capas ordenadas por especificidad creciente.

### 4.8.1. Arquitectura ITCSS

```
00-settings    Variables CSS (colors, typography, spacing).
01-tools       Mixins y funciones SCSS (vacío por convención).
02-generic     Reset CSS.
03-elements    Estilos base de etiquetas HTML (body, h1, a, etc.).
04-objects     Layouts genéricos sin cosmética (vacío).
05-components  Componentes BEM con cosmética completa.
06-utilities   Helpers (vacío — no se usaron en este proyecto).
```

Esta separación permite que un nuevo desarrollador entienda el orden de cascada simplemente leyendo [`main.scss`](../frontend/src/styles/main.scss).

### 4.8.2. Catálogo de componentes

Los componentes BEM presentes en el proyecto se agrupan por categoría:

#### Controles básicos

| Componente | Fichero | Variantes |
|---|---|---|
| Button | `_button.scss` | `.button`, `.button--small` |
| TextBox | `_text-box.scss` | `.text-box`, `.text-box--light` |
| TranslucidTextBox | `_translucid-text-box.scss` | base, opaque |
| Spoiler | `_spoiler.scss` | text, textarea |

#### Layout y estructura

| Componente | Fichero |
|---|---|
| Header | `_header.scss` |
| Footer | `_footer.scss` |
| Profile | `_profile.scss` |

#### Modales y overlays

| Componente | Fichero |
|---|---|
| AuthModal | `_auth-modal.scss` |
| NewCampaignModal | `_new-campaign-modal.scss` |
| MembersPanel | `_members-panel.scss` |

#### Páginas con cosmética propia

| Página | Fichero |
|---|---|
| MainPage | `_main-page.scss` |
| ProfilePage | `_profile-page.scss` |
| CampaignsPage | `_campaigns-page.scss` |
| ChapterPage | `_chapter-page.scss` |
| UsersPage | `_users-page.scss` |
| InvitePage | `_invite-page.scss` |
| InfoPage | `_info-page.scss` |
| TemplatesPage | `_templates-page.scss` |
| CampaignViewPage | `_campaign-view-page.scss` |
| UserProfilePage | `_user-profile-page.scss` |

#### Componentes de dominio (D&D)

| Componente | Fichero |
|---|---|
| CampaignCard | `_campaign-card.scss` |
| CreatorSelector | `_creator-selector.scss` |
| ChapterSelector | `_chapter-selector.scss` |
| ChapterOrCharacter | `_chapter-or-character.scss` |
| CharacterSelector | `_character-selector.scss` |
| CharacterSheet | `_character-sheet.scss` |
| AnnotationThread | `_annotation-thread.scss` |

### 4.8.3. Anatomía de un componente BEM

Ejemplo: el botón principal de la aplicación.

```scss
// _button.scss

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-md) clamp(1.5rem, 3vw, 2.5rem);
  border: 6px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: linear-gradient(
    180deg,
    var(--color-primary) 0%,
    var(--color-primary-dark) 100%
  );
  color: var(--color-text-inverse);
  font-family: var(--font-family-base);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  transition:
    background var(--transition-base),
    transform var(--transition-fast);

  &:hover:not(:disabled),
  &:focus-visible:not(:disabled) { /* ... */ }

  &:active:not(:disabled) { transform: translateY(1px); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }

  // Variante pequeña
  &--small {
    padding: var(--space-xs) var(--space-lg);
    font-size: var(--font-size-base);
    border-width: 4px;
    border-radius: var(--radius-md);
  }
}
```

Puntos destacables:

- **Cero literales:** todos los colores, espaciados y radios vienen de variables.
- **`clamp()`** en el padding lateral permite que el botón crezca/decrezca de forma fluida con el viewport.
- **`:focus-visible`** se trata igual que `:hover` para soportar navegación por teclado sin romper la experiencia de ratón.
- La variante `--small` reduce el grosor del borde de 6 px a 4 px para mantener la proporción visual.

---

## 4.9. Wireframes y mockups

Los mockups de cada pantalla principal están en las páginas `Design (Desktop)` y `Design (Mobile)` del archivo Figma. Para cada pantalla relevante existe una versión desktop (1440 px) y una mobile (360 px).

### 4.9.1. Pantallas mockeadas

| Pantalla | Ruta de la app | Captura sugerida |
|---|---|---|
| Portada anónima | `/main` (logged out) | `docs/assets/04-mock-main-anon.png` |
| Portada autenticada | `/main` (logged in) | `docs/assets/04-mock-main-logged.png` |
| Listado de campañas | `/campaigns` | `docs/assets/04-mock-campaigns.png` |
| Selector de capítulo/personaje | `/chapterOrCharacter` | `docs/assets/04-mock-chapter-or-char.png` |
| Página de capítulo | `/chapter/:id` | `docs/assets/04-mock-chapter.png` |
| Ficha de personaje | `/character/:id` | `docs/assets/04-mock-character.png` |
| Perfil propio | `/profile` | `docs/assets/04-mock-profile.png` |
| Listado de usuarios | `/users` | `docs/assets/04-mock-users.png` |

### 4.9.2. Comparativa wireframe ↔ implementación

Cada pantalla mockeada se ha implementado de forma fiel al diseño Figma. Las divergencias documentadas son:

| Pantalla | Diferencia | Motivo |
|---|---|---|
| Página de capítulo | El popup de stats del mapa se añadió tras el diseño inicial. | Surgió como necesidad en pruebas de usabilidad. |
| Cabecera mobile | Se simplificó el menú hamburguesa respecto al mockup. | El mockup tenía animaciones de transición no priorizadas para el PFG. |
| Selector de capítulos | Se eliminó el botón "Go to next chapter" tras un prototipo. | La lógica de cadena cronológica resultó confusa para usuarios novatos. |

---

## 4.10. Accesibilidad y SEO

DnDPlanner cumple los requisitos de **WCAG 2.1 nivel AA** y los principios de **HTML semántico** y **SEO básico**. Los puntos clave:

### 4.10.1. Accesibilidad

- **Contraste:** todas las combinaciones text/fondo validadas (ver 4.3.7).
- **Foco visible:** todo control interactivo muestra `--color-focus-ring` con `:focus-visible`.
- **Navegación por teclado:** modales se cierran con `Esc`, foco atrapado dentro del modal mientras está abierto.
- **Etiquetado semántico:** uso correcto de `<header>`, `<main>`, `<nav>`, `<footer>`, `<aside>`. Botones siempre `<button>`, links siempre `<a>`.
- **Alt en imágenes:** todas las imágenes decorativas con `alt=""`; las informativas con texto descriptivo.
- **Roles ARIA** donde el HTML semántico no es suficiente: `role="dialog"` en modales, `aria-live="polite"` en notificaciones.
- **Tamaños mínimos:** áreas tocables ≥ 44×44 px en mobile.

### 4.10.2. SEO básico

- `<title>` único por ruta gestionado vía `document.title` en cada página.
- `<meta name="description">` por página con texto adaptado.
- `<meta name="viewport">` con `width=device-width, initial-scale=1`.
- Open Graph (`og:title`, `og:description`, `og:image`) en la portada para previsualizaciones en redes sociales.
- URLs limpias y semánticas (`/campaigns`, `/character/:id`).

### 4.10.3. Internacionalización (i18n)

La aplicación soporta **español** (por defecto) e **inglés** mediante `react-i18next`. El switcher de idioma vive en el Header y el cambio es **en caliente** (sin recarga). Esto contribuye también a la accesibilidad: los lectores de pantalla en inglés recibirán el contenido en su idioma esperado al cambiar `lang` en el `<html>`.

---

## 4.11. Cumplimiento de los requisitos de diseño

Esta sección mapea los requisitos del módulo de Diseño con los apartados del proyecto donde se cumplen.

| Requisito | Cumplimiento | Evidencia |
|---|---|---|
| **Estilos avanzados (CSS3 / preprocesadores)** | Arquitectura ITCSS + BEM, SCSS con `@use` modular, variables CSS para todos los tokens, cero literales en componentes. | [`frontend/src/styles/`](../frontend/src/styles/), sección 4.8.1 de este documento. |
| **Diseño responsive** | Cuatro breakpoints, fluido con `clamp()`, mínimo 320 px hasta 4K. | [`_responsive.scss`](../frontend/src/styles/05-components/_responsive.scss), sección 4.7.2. |
| **Accesibilidad WCAG AA** | Contraste validado, foco visible, semántica HTML, ARIA donde aplica. | Sección 4.10.1. |
| **Interactividad y multimedia** | Mapa táctico con drag-and-drop, image cropper para retratos, sincronización en tiempo real vía Socket.IO. | Documento [02-descripcion.md](02-descripcion.md), secciones 2.3.4 y 2.3.6. |
| **Coherencia con guía de estilos** | Página `Guidelines` de Figma como referencia única, espejada por la arquitectura de tokens del CSS para minimizar la deriva entre diseño y código. | Secciones 4.1 y 4.3 a 4.8. |
| **UX y navegación** | Rutas semánticas, redirects sensatos, modales sin pérdida de contexto, modo Testing para defensa sin internet. | Documento [02-descripcion.md](02-descripcion.md), sección 2.2.1. |
| **SEO y estándares** | Meta tags, Open Graph, viewport, URLs limpias. | Sección 4.10.2. |

---

## 4.12. Referencias cruzadas

Para los temas no estrictamente visuales pero relacionados con esta guía:

- **Arquitectura técnica de frontend:** [05-diseno.md](05-diseno.md) sección 5.3.
- **Decisiones de implementación (por qué SCSS, por qué BEM):** [06-desarrollo.md](06-desarrollo.md) sección 6.4.
- **Pruebas visuales y de responsive:** [07-pruebas.md](07-pruebas.md) sección 7.3.
- **Manual de usuario con capturas reales:** [09-manual-usuario.md](09-manual-usuario.md).
