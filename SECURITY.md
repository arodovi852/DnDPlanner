# Política de seguridad

DnDPlanner toma en serio la seguridad de sus usuarios. Esta política explica **qué versiones reciben parches**, **cómo reportar una vulnerabilidad de forma responsable** y **qué puedes esperar tras el reporte**.

---

## Versiones soportadas

El proyecto se publica desde una única rama (`main`) y los despliegues en producción siguen siempre el último commit verde de CI.

| Versión | Soportada |
|---|---|
| Último commit en `main` (producción `dndplanner.me`) | ✅ |
| Versiones anteriores | ❌ |

Si encuentras un problema en una versión antigua, primero verifica que sigue presente en `main` antes de reportarlo.

---

## Cómo reportar una vulnerabilidad

**No abras un issue público.** Si crees haber encontrado una vulnerabilidad de seguridad, repórtala de forma privada por uno de estos canales:

1. **GitHub Security Advisories** (preferido):
   - Ve a la pestaña **Security** del repositorio.
   - Pulsa **"Report a vulnerability"**.
   - Rellena el formulario con el máximo detalle posible.
   - Solo el mantenedor verá el reporte hasta que se publique el aviso.

2. **Email directo:** `rodriguezoviedoalberto222301@gmail.com` con el asunto `[SECURITY] DnDPlanner – <descripción breve>`.

### Qué incluir en el reporte

Para que pueda reproducir y priorizar:

- **Descripción del problema** y el impacto que provocaría si se explota.
- **Pasos detallados para reproducirlo** (URL, payload, credenciales si aplica).
- **Versión y entorno** (commit SHA, navegador y sistema operativo si es un bug del cliente; runtime y versión de Node si es del backend).
- **Prueba de concepto** si la tienes (screenshot, vídeo corto, request HTTP completa). No es obligatorio.
- **Impacto estimado** desde tu perspectiva: lectura, modificación o exfiltración de datos, escalado de privilegios, denegación de servicio, etc.

---

## Lo que puedes esperar

| Acción | Plazo |
|---|---|
| Acuse de recibo | ≤ 72 horas hábiles |
| Primera evaluación (severidad y reproducibilidad) | ≤ 7 días |
| Resolución (parche en `main`) | Según severidad: críticas en días, otras en semanas |
| Aviso público (security advisory) | Tras el parche, sin nombrar al reporter sin permiso |

Si necesitas un canal cifrado adicional (PGP, Signal), indícalo en el primer mensaje y lo arreglamos.

---

## Buenas prácticas que ya aplica el proyecto

Para contextualizar lo que ya está hecho y dónde **no** suele haber problema:

- **Contraseñas:** hashing con `bcrypt` (cost 12).
- **Sesiones:** JWT con refresh, con `JWT_SECRET` y `JWT_REFRESH_SECRET` distintos y rotables sin redeploy de código.
- **Headers de seguridad:** `helmet` con configuración por defecto + `Strict-Transport-Security` en producción.
- **Rate limiting:** `express-rate-limit` (100 peticiones por ventana de 15 minutos por IP).
- **CORS estricto:** únicamente el origen del frontend (`CORS_ORIGIN` en `.env`).
- **Validación de entrada:** `express-validator` en todas las rutas que aceptan body o params.
- **Autorización:** métodos del modelo `Campaign` (`hasAccess`, `canEdit`, `getMemberRole`) usados tanto por las rutas REST como por los handlers de Socket.IO, garantizando una única fuente de verdad.
- **Secrets fuera del repo:** `.env` ignorado; `.env.example` documenta las claves esperadas sin valores reales.
- **Tokens en cliente:** `localStorage` (acepta el trade-off frente a XSS estricto a cambio de evitar CSRF). El XSS está mitigado por el escape automático de React y por la ausencia de `dangerouslyInnerHTML`.

Si encuentras una vulnerabilidad que rompa cualquiera de estas suposiciones (por ejemplo, una ruta sin validación, un endpoint que se salta `canEdit`, o una forma de inyectar HTML en una vista), repórtala.

---

## Qué NO consideramos vulnerabilidad

Por evitar trabajo en falso, los siguientes informes se cerrarán como no aplicables:

- **Auto-XSS** (necesario que el atacante engañe al usuario a pegar código en la consola del navegador).
- **Falta de cabeceras "nice to have"** sin un vector de ataque concreto (`X-XSS-Protection`, `X-Content-Type-Options` en respuestas no-HTML, etc.).
- **Inundación de email / DoS desde un único cliente sin amplificación.** Está cubierto por rate limiting.
- **Información en headers HTTP** que el stack revela por defecto (`Server: nginx/...`) — es información pública.
- **Reportes generados solo por escáneres automáticos** sin verificación manual ni reproducibilidad.

---

## Reconocimientos

Si tu reporte resulta en una vulnerabilidad real corregida, te listaremos —**con tu permiso y nombre/handle a elegir**— en el aviso público asociado. Sin afán comercial, simplemente como agradecimiento por el reporte responsable.

---

Gracias por ayudar a mantener DnDPlanner seguro para sus usuarios.
