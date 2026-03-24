# DnDPlanner Backend API

Backend API REST para DnDPlanner, una aplicación de gestión de campañas de D&D y juegos de rol.

## Stack Tecnológico

- **Node.js** + **Express** - Framework del servidor
- **MongoDB** + **Mongoose** - Base de datos
- **JWT** - Autenticación
- **Socket.IO** - Comunicación en tiempo real
- **Cloudinary** - Almacenamiento de imágenes
- **D&D 5e API** - Datos de monstruos, hechizos, etc.

## Requisitos

- Node.js >= 18.0.0
- MongoDB (local o Atlas)
- Cuenta de Cloudinary (opcional, para imágenes)

## Instalación

1. Clonar el repositorio
2. Instalar dependencias:

```bash
cd backend
npm install
```

3. Configurar variables de entorno:

```bash
cp .env.example .env
# Editar .env con tus configuraciones
```

4. Iniciar el servidor:

```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## Variables de Entorno

| Variable | Descripción | Requerido |
|----------|-------------|-----------|
| `PORT` | Puerto del servidor (default: 3000) | No |
| `NODE_ENV` | Entorno (development/production) | No |
| `MONGO_URI` | URI de conexión a MongoDB | Sí |
| `JWT_SECRET` | Clave secreta para tokens JWT | Sí |
| `JWT_REFRESH_SECRET` | Clave secreta para refresh tokens | Sí |
| `CLOUDINARY_CLOUD_NAME` | Nombre de cloud en Cloudinary | No |
| `CLOUDINARY_API_KEY` | API Key de Cloudinary | No |
| `CLOUDINARY_API_SECRET` | API Secret de Cloudinary | No |
| `CORS_ORIGIN` | Origen permitido para CORS | No |

## Estructura del Proyecto

```
backend/
├── src/
│   ├── config/          # Configuraciones
│   ├── controllers/     # Controladores
│   ├── middlewares/     # Middlewares
│   ├── models/          # Modelos de MongoDB
│   ├── routes/          # Rutas de la API
│   ├── services/        # Servicios externos
│   ├── utils/           # Utilidades
│   ├── validators/      # Validadores
│   └── server.js        # Punto de entrada
├── tests/               # Tests
├── .env.example
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## Endpoints de la API

### Autenticación (`/api/auth`)
- `POST /register` - Registrar usuario
- `POST /login` - Iniciar sesión
- `POST /refresh` - Refrescar token
- `POST /logout` - Cerrar sesión
- `GET /me` - Obtener perfil
- `PUT /me` - Actualizar perfil
- `DELETE /account` - Eliminar cuenta

### Campañas (`/api/campaigns`)
- `GET /` - Listar campañas
- `POST /` - Crear campaña
- `GET /:id` - Obtener campaña
- `PUT /:id` - Actualizar campaña
- `DELETE /:id` - Eliminar campaña
- `POST /:id/share` - Compartir campaña
- `PUT /:id/permissions` - Actualizar permisos

### Capítulos (`/api/chapters`)
- `GET /campaign/:campaignId` - Listar capítulos
- `POST /campaign/:campaignId` - Crear capítulo
- `GET /:id` - Obtener capítulo
- `PUT /:id` - Actualizar capítulo
- `DELETE /:id` - Eliminar capítulo

### Eventos (`/api/events`)
- `GET /chapter/:chapterId` - Listar eventos
- `POST /chapter/:chapterId` - Crear evento
- `GET /:id` - Obtener evento
- `PUT /:id` - Actualizar evento
- `DELETE /:id` - Eliminar evento

### Mapas (`/api/maps`)
- `GET /campaign/:campaignId` - Listar mapas
- `POST /campaign/:campaignId` - Crear mapa
- `GET /:id` - Obtener mapa
- `PUT /:id` - Actualizar mapa
- `DELETE /:id` - Eliminar mapa

### Personajes (`/api/characters`)
- `GET /campaign/:campaignId` - Listar personajes
- `POST /campaign/:campaignId` - Crear personaje
- `GET /:id` - Obtener personaje
- `PUT /:id` - Actualizar personaje
- `DELETE /:id` - Eliminar personaje

### D&D API (`/api/dnd`)
- `GET /monsters` - Listar monstruos
- `GET /monsters/:index` - Obtener monstruo
- `GET /spells` - Listar hechizos
- `GET /classes` - Listar clases
- `GET /races` - Listar razas

### Upload (`/api/upload`)
- `POST /image` - Subir imagen
- `POST /avatar` - Subir avatar
- `POST /character` - Subir imagen de personaje
- `POST /map` - Subir fondo de mapa
- `DELETE /:publicId` - Eliminar imagen

## WebSockets (Socket.IO)

Eventos disponibles:
- `join:campaign` - Unirse a sala de campaña
- `leave:campaign` - Salir de sala de campaña
- `map:update` / `map:updated` - Actualización de mapa
- `combat:update` / `combat:updated` - Actualización de combate
- `visibility:toggle` / `visibility:changed` - Cambio de visibilidad

## Docker

```bash
# Desarrollo con Docker Compose
docker-compose up

# Solo build
docker build -t dndplanner-api .
```

## Testing

```bash
npm test
npm run test:watch
```

## Despliegue

El proyecto está configurado para desplegarse en:
- **Railway** (`railway.toml`)
- **Render** (`render.yaml`)
- **Docker** (`Dockerfile` + `docker-compose.yml`)

## Licencia

ISC
