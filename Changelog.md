# Changelog — Cambios del commit

Lista enumerada de cambios implementados en este commit del frontend de DNDPlanner.

---

## 1. Ficha de personaje (/character/:id) — rework visual + API D&D

1. **Layout centrado con max-width**: la ficha pasa de ocupar el ancho completo del viewport a un bloque centrado de **60rem máximo** con márgenes laterales.
2. **Paneles más oscuros**: todos los recuadros (stats, traits, listas, descripción) usan `--color-chrome-strong` (#2a1d1d) en vez de `--color-chrome` (#3d2b2b) → contraste visible contra el fondo.
3. **Stats compactas**: la grid interna pasa de `auto 1fr auto` (espacio muerto) a `2.6rem 3.2rem auto` → "STR 10 (+0)" queda junto.
4. **Retrato estilo pill rosa**: borde `--color-primary`, fondo rosa y barra inferior con el nombre del personaje en blanco + botón ✏︎ integrado.
5. **Labels en negrita**: stat-label, field-label, list-label, combat-label y description-label ahora usan `font-weight: bold` para mejor legibilidad sobre el fondo oscuro.
6. **Autofill ampliado al elegir clase D&D**: al seleccionar una clase del dropdown de la API `dnd5eapi.co`, se rellenan automáticamente `damageDice`, `hp`, `maxHp`, `savingThrows`, `skills` (proficiencies) e `inventory` (starting equipment). Antes sólo se rellenaban 2 campos.
7. **Sincronización del modo Homebrew**: si un personaje tiene una clase que no está en el catálogo, se detecta correctamente aunque la API responda después del primer render.

---

## 2. Sistema social — seguir / dejar de seguir (NEW)

8. **UsersContext**: contexto global nuevo ([src/context/UsersContext.tsx](frontend/src/context/UsersContext.tsx)) con:
   - Directorio de usuarios mock (`SEED_USERS`) + persistencia en `localStorage`.
   - Grafo de relaciones `followers / following` persistido.
   - Helpers: `followUser`, `unfollowUser`, `isFollowing`, `getFollowing`, `getFollowers`, `searchUsers`, `findByUsername`, `ensureUser`.
9. **AuthContext con `id` estable**: el usuario autenticado expone ahora un `id` derivado del username (`user-alba`, etc.) que permite referenciar al usuario en membresías y follows.
10. **FollowButton**: componente toggle ([src/components/shared/FollowButton/](frontend/src/components/shared/FollowButton/FollowButton.tsx)) que muestra "Seguir" o "Dejar de seguir" según el estado. Se oculta si el usuario no está logueado o es el propio.
11. **Página /users**: nueva página ([src/pages/UsersPage.tsx](frontend/src/pages/UsersPage.tsx)) con tabs (Todos / Siguiendo / Seguidores) y buscador por nombre o email.
12. **Link "Personas" en el Header**: accesible desde cualquier página cuando estás autenticado.

---

## 3. Sistema de miembros y roles de campaña (NEW)

13. **Modelo extendido de Campaign**: el tipo `Campaign` en [CampaignContext.tsx](frontend/src/context/CampaignContext.tsx) añade:
    - `ownerId` (creador original = DM).
    - `members: CampaignMember[]` con `userId`, `role: 'dm' | 'co-dm' | 'player'`, `characterId?`, `joinedAt`.
    - `annotations: Annotation[]`.
    - `revealedSpoilers: string[]`.
    - `shareToken?: string`.
14. **Migración transparente**: al leer de `localStorage` se normalizan campañas antiguas rellenando campos nuevos con valores por defecto (no se pierde nada).
15. **Nuevos métodos en CampaignContext**:
    - `addMember`, `removeMember`, `updateMemberRole`, `assignCharacter`.
    - `addAnnotation`, `removeAnnotation`.
    - `toggleSpoiler`, `revealAllSpoilers`, `hideAllSpoilers`.
    - `generateShareToken`, `revokeShareToken`, `findByShareToken`, `acceptInvite`.
    - `getRole`, helper externo `isDungeonMaster`, `canSeeSpoilers`, `spoilerHash`.
16. **MembersPanel modal** ([src/components/shared/MembersPanel/](frontend/src/components/shared/MembersPanel/MembersPanel.tsx)): gestiona miembros con:
    - Lista con rol (dropdown DM / Co-DM / Player) y personaje asignado.
    - Añadir miembro por nombre de usuario con sugerencias tipeahead.
    - Botón eliminar (nunca se puede expulsar al owner).
    - FollowButton inline para cada miembro.
17. **Botón "Miembros · N" en /chapterOrCharacter**: entrada visible al panel desde el hub de la campaña.
18. **Creator queda como DM por defecto**: `createCampaign` ahora requiere `ownerId` y añade automáticamente al creador como miembro con rol `dm`.

---

## 4. Invitaciones y compartir (NEW)

19. **Enlace de invitación**: el DM pulsa "Generar enlace" en MembersPanel y obtiene un `shareToken` único. La URL `/invite/:token` se puede copiar al portapapeles (con feedback "¡Copiado!" 2s) o revocar.
20. **Página /invite/:token** ([src/pages/InvitePage.tsx](frontend/src/pages/InvitePage.tsx)):
    - Busca la campaña por token; si no existe muestra estado "inválido".
    - Si el usuario no está logueado, abre AuthModal antes de unirse.
    - Al unirse se añade al usuario como `player` y redirige al hub de la campaña.
21. **Share-to-socials**: debajo del input de URL, botones con deep-links para **WhatsApp**, **X/Twitter**, **Telegram** y **email** con texto pre-formateado (`"Join my D&D campaign \"{name}\" on DNDPlanner"`).

---

## 5. Sistema REDACTED / Spoilers (NEW)

22. **Sintaxis `||texto||`**: marca una porción del texto como spoiler. Funciona en la descripción del personaje y en las anotaciones.
23. **Hash determinista (djb2)**: `spoilerHash(text)` genera un ID estable por contenido → permite que la decisión "revelado / oculto" sobreviva a recargas.
24. **Componente SpoilerText** ([src/components/shared/Spoiler/SpoilerText.tsx](frontend/src/components/shared/Spoiler/SpoilerText.tsx)):
    - **DM**: ve el texto con un chip clicable → toggle revelar/ocultar para jugadores.
    - **Jugador + oculto**: barra negra censurada (█) del ancho aproximado del texto.
    - **Jugador + revelado**: texto visible con fondo amarillo suave.
25. **SpoilerTextarea**: textarea con botón **"Marcar como spoiler"** que envuelve la selección actual (o inserta `||secret||` con el placeholder seleccionado) → sólo visible para DM.
26. **Integrado en la descripción del personaje**: jugadores con el personaje asignado pueden editar el texto pero no crear nuevos spoilers (flag `readOnlyMarker`); el DM sí.

---

## 6. Anotaciones de jugadores (NEW)

27. **Modelo Annotation**: `{ id, userId, targetType: 'character' | 'chapter', targetId, text, createdAt }` persistido dentro de la campaña.
28. **Componente AnnotationThread** ([src/components/shared/AnnotationThread/](frontend/src/components/shared/AnnotationThread/AnnotationThread.tsx)):
    - Lista anotaciones con autor, fecha y botón eliminar (sólo DM o autor original).
    - Input para añadir nota (soporta sintaxis `||spoiler||`).
    - Contador de anotaciones en la cabecera.
29. **AnnotationThread integrado** al final de:
    - `/character/:id` (`targetType: 'character'`)
    - `/chapter/:chapterId` (`targetType: 'chapter'`)
30. **Sólo miembros pueden ver/añadir**: si el usuario no tiene rol en la campaña, el hilo no se renderiza.

---

## 7. Restricciones por rol (edits)

31. **CharacterSheetPage**: sólo el DM/Co-DM o el jugador con ese personaje asignado pueden editar. Los demás miembros ven la ficha en modo lectura con `SpoilerText` aplicado a la descripción.
32. **MembersPanel**: sólo el owner (DM original) y Co-DMs pueden añadir/eliminar miembros y cambiar roles. El owner nunca puede perder su rol.

---

## 8. Events canvas (/chapter#) — mejoras

33. **Edición inmediata al crear bloque**: al usar la herramienta Create + click, el bloque nace con texto vacío y entra **directamente en modo edición** (textarea auto-focused + seleccionado).
34. **Click derecho elimina el bloque**: `onContextMenu` → preventDefault → borra el bloque y todas sus conexiones entrantes/salientes.
35. **Drag para conectar**: además del modo "click A, click B", ahora también funciona **pulsar en el bloque A, arrastrar y soltar sobre el bloque B**. Durante el arrastre se muestra una línea-preview discontinua desde A hasta el cursor.
36. **Terminal "Ir al siguiente capítulo"**: bloque especial renderizado automáticamente al final del camino más largo del canvas. Al hacer clic navega al siguiente capítulo de la campaña (`chapters[idx+1]`). Si es el último capítulo, muestra "Fin de la campaña" y lleva al selector. Conexión virtual en rosa discontinuo desde el último nodo.
37. **Nuevo diseño de bloque**:
    - **Cabecera rosa clara** con el tipo de evento en mayúsculas + caret `▾`.
    - **Cuerpo más oscuro** con el texto.
    - Borde negro grueso y esquinas redondeadas.
    - Un `<select>` invisible cubre la cabecera completa → al clicarla se abre el dropdown nativo para cambiar el tipo.
38. **Tipos por bloque** editables siempre (antes sólo al crear): cada bloque guarda su `type` y puede cambiarse desde el dropdown del header.
39. **Doble clic edita el texto**: atajo rápido para editar sin cambiar a la herramienta text.
40. **Escape cancela edición**, **Enter confirma** (Shift+Enter = nueva línea).

---

## 9. Rutas e integración global

41. **App.tsx**: envuelto en `<UsersProvider>` + nuevas rutas `/users` y `/invite/:token`.
42. **Rutas finales**: `/main`, `/profile`, `/users`, `/campaigns`, `/creatorSelector`, `/chapterOrCharacter`, `/chapterSelector`, `/characterSelector`, `/character/:characterId`, `/chapter/:chapterId`, `/invite/:token`.

---

## 10. Estilos (SCSS) y traducciones (i18n)

43. **Nuevos parciales SCSS** registrados en `main.scss`:
    - `_spoiler.scss` — chips DM, redacted, revelado y textarea con "Marcar como spoiler".
    - `_members-panel.scss` — modal de miembros + share-to-socials + FollowButton.
    - `_annotation-thread.scss` — hilo de anotaciones estilo card oscura.
    - `_users-page.scss` — tabs + lista de usuarios + buscador.
    - `_invite-page.scss` — pantalla de aceptación de invitación centrada.
44. **Actualización de `_chapter-page.scss`**: estilos del nuevo bloque (header + body), terminal "Ir al siguiente capítulo", estado `--editing`.
45. **Actualización de `_chapter-or-character.scss`**: toolbar con el botón "Miembros".
46. **Actualización de `_character-sheet.scss`** (ver punto 1).
47. **i18n ampliado** en [en.json](frontend/src/i18n/locales/en.json) y [es.json](frontend/src/i18n/locales/es.json):
    - `social.follow` / `unfollow`.
    - Namespace `users.*` (título, tabs, empty, searchPlaceholder).
    - Namespace `members.*` (roles, invite link, share, copy, revoke, suggestions).
    - Namespace `invite.*` (title, body, join, joined, invalid, loginToJoin).
    - Namespace `annotations.*` (heading, character/chapterHeading, empty, placeholder, send).
    - Namespace `spoiler.*` (mark, revealAll, hideAll).
    - `header.people`, `chapterOrCharacter.heading`, `chapter.nextChapter`, `chapter.finalChapter`, `chapter.tools.connect` actualizado para indicar "click o arrastrar".

---

## 11. Tareas de base de datos / backend pendientes

Para desplegar estas funcionalidades en producción hace falta añadir al backend:

48. **Endpoints de follow/unfollow**: `POST /users/{id}/follow`, `DELETE /users/{id}/follow`, `GET /users/me/following`, `GET /users/me/followers`.
49. **Miembros de campaña**: sub-recurso `POST /campaigns/{id}/members`, `PATCH /campaigns/{id}/members/{userId}` (role + characterId), `DELETE /campaigns/{id}/members/{userId}`.
50. **Invitaciones**: `POST /campaigns/{id}/invite` (genera token), `POST /invites/{token}/accept`, `DELETE /campaigns/{id}/invite`.
51. **Anotaciones**: `POST /campaigns/{id}/annotations`, `DELETE /campaigns/{id}/annotations/{annId}`.
52. **Spoilers revelados**: campo `revealedSpoilers: string[]` en la tabla de campaña o sub-recurso.
53. **Búsqueda de usuarios**: `GET /users?q={query}` para el autocomplete de MembersPanel.
54. **Persistencia del canvas de eventos**: decidir si el grafo (`blocks + connections`) vive dentro del `Chapter` (campo `canvasState`) o como entidades `Event` separadas con coordenadas.

---

## 12. Verificación

55. **Typecheck**: `tsc -b` sin errores.
56. **Build de producción**: `npm run build` compila 124 módulos, CSS 55kb, JS 315kb (89kb gzip), sin warnings propios.
