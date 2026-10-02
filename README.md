# Backend Boilerplate

Plantilla genérica para arrancar cualquier proyecto backend con:

- **Node.js** + **Fastify** (JavaScript, CommonJS)
- **PostgreSQL** como base de datos
- **Docker** para desarrollo y para tests (contenedores independientes)
- **AJV / JSON Schema** para validar rutas y variables de entorno
- **node-pg-migrate** para migraciones de base de datos
- **Jest** para tests de integración
- **OpenAPI (`@fastify/swagger`) + Scalar** para documentación interactiva de la API
- **GitHub Actions** ejecutando lint y tests en cada PR

## Estructura

```
src/
  app.js            # construye la instancia de Fastify (autoload de plugins/routes)
  server.js         # arranca el servidor HTTP
  config/           # carga y valida variables de entorno con AJV
  plugins/          # plugins de Fastify (BD, JWT, autorización, manejo de errores, esquemas compartidos)
  schemas/          # esquemas AJV (JSON Schema) por entidad
  routes/           # definición de endpoints, referencian los esquemas
  handlers/         # lógica de negocio y acceso a datos
  providers/        # verificación específica de cada proveedor de identidad (Google, ...)
  services/         # lógica de negocio compartida entre handlers (ej. alta/enlace de usuarios)
migrations/         # migraciones de node-pg-migrate
test/               # tests de integración con Jest (fastify.inject)
rest/               # ficheros .rest para probar endpoints (extensión REST Client de VSCode)
```

## Documentación interactiva (Scalar)

Con el servidor levantado, abre `http://localhost:3000/reference` para ver la documentación interactiva de la API (generada a partir de los esquemas AJV de cada ruta vía `@fastify/swagger`, renderizada con [Scalar](https://scalar.com)). El documento OpenAPI en bruto está en `/reference/openapi.json` (o `.yaml`).

Para documentar una ruta nueva, añade `tags`, `summary`/`description` y, si está protegida, `security: [{ bearerAuth: [] }]` a su esquema AJV (ver `src/schemas/auth.schema.js` como ejemplo) — no hace falta tocar `src/plugins/swagger.js`.

## Autenticación e identidades

El login funciona por proveedores de identidad externos (actualmente solo Google) en vez de contraseña propia:

- `users`: el perfil de la cuenta (`id`, `name`, `email`, `avatar_url`).
- `identities`: qué proveedores tiene vinculados cada usuario (`provider`, `provider_user_id`, `user_id`), con `(provider, provider_user_id)` único.
- `refresh_tokens`: refresh tokens opacos (no JWT) por usuario, con hash guardado (no el valor en claro), fecha de expiración y revocación — independientes del proveedor usado para el login.

Cada login (`POST /auth/google`) devuelve `{ accessToken, refreshToken, user }`. El `accessToken` (JWT, corta duración vía `JWT_EXPIRES_IN`) se usa en `Authorization: Bearer` para las rutas protegidas. Cuando expira, `POST /auth/refresh` con `{ refresh_token }` devuelve un par nuevo `{ accessToken, refreshToken }` y **revoca el refresh token usado** (rotación): cada refresh token solo sirve una vez, así que si se reutiliza uno ya rotado (p. ej. porque fue robado), la petición falla con 401.

`POST /auth/logout` (protegido) revoca de golpe **todos** los refresh tokens vivos del usuario autenticado (todas las sesiones/dispositivos), para el caso de robo de dispositivo o simplemente cerrar sesión en todos lados. El `accessToken` en curso sigue siendo válido hasta que expire por su cuenta (es un JWT stateless, no se puede revocar antes de tiempo), pero ya no podrá renovarse con `/auth/refresh`.

`src/services/identity.service.js` centraliza la lógica de "buscar la identidad o crear/enlazar el usuario", independiente del proveedor. `src/providers/google.js` verifica el `id_token` de Google y devuelve un perfil normalizado (`{ provider, providerUserId, email, name, avatarUrl }`) que ese servicio consume.

### Añadir un nuevo proveedor de identidad

1. Crea `src/providers/<proveedor>.js` con una función que verifique la credencial de ese proveedor (token, code, etc.) y devuelva `{ provider: '<proveedor>', providerUserId, email, emailVerified, name, avatarUrl }`. `emailVerified` debe reflejar si el proveedor confirma que el email es del usuario (ej. `email_verified` en Google) — si no es `true`, `identity.service.js` rechaza la creación/enlace de cuenta por email para evitar que alguien reclame la cuenta de otra persona.
2. Añade un endpoint en `src/routes/auth.routes.js` (ej. `POST /auth/<proveedor>`) con su handler en `src/handlers/auth.handlers.js`, que llame a esa función y luego a `findOrCreateUserFromIdentity` de `identity.service.js`.
3. Si el proveedor requiere client id/secret, añádelos a `src/config/index.js` y a `.env.example`.

No hace falta tocar el esquema de `users` ni `identities` para añadir proveedores nuevos.

## Inicio rápido (make)

El proyecto incluye un `Makefile` con los comandos más habituales, para no memorizar los `docker compose` largos:

```bash
make up             # crea .env/.env.test si no existen y levanta backend + db
make migrate-up     # aplica migraciones dentro del contenedor backend
make test           # corre los tests en su contenedor aislado (con su propia BD)
make down           # detiene y elimina los contenedores de desarrollo
make help           # lista todos los comandos disponibles
```

Por defecto usa el binario `docker-compose`. Si en tu máquina tienes el plugin moderno `docker compose` (con espacio), pasa `DC="docker compose"` (o cambia el valor por defecto al principio del `Makefile`):

```bash
make up DC="docker compose"
```

## Redes corporativas con inspección TLS (Netskope, etc.)

Si `docker compose build` falla con un error del tipo `self-signed certificate in certificate chain` al instalar dependencias, tu red está interceptando TLS. Define `STRICT_SSL=false` en tu `.env` (o como variable de entorno del shell) para desactivar la verificación TLS solo durante el build de las imágenes:

```
STRICT_SSL=false
```

Por defecto es `true` (verificación activada); sin definir la variable, el comportamiento es exactamente el mismo que sin proxy corporativo.

> ⚠️ Con `STRICT_SSL=false` las descargas de dependencias durante el build no verifican la identidad del servidor remoto. Úsalo solo si es imprescindible en tu red corporativa, y no lo dejes activado en pipelines fuera de esa red.

## Probar endpoints sin Postman

En `rest/` hay un fichero `.rest` por recurso (`health.rest`, `auth.rest`) pensado para la extensión [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) de VSCode. Con el servidor levantado (`docker compose up` o `pnpm dev`), abre el fichero y pulsa "Send Request" sobre cada petición.

## Desarrollo local (Docker)

```bash
cp .env.example .env
docker compose up --build
```

Esto levanta dos contenedores: `db` (Postgres persistente) y `backend` (Fastify con hot-reload vía nodemon, puerto 3000).

Aplicar migraciones dentro del contenedor de backend:

```bash
docker compose exec backend pnpm migrate:up
```

## Tests (contenedor independiente)

Los tests corren en un contenedor **distinto** al de desarrollo, contra su propia base de datos efímera (`db-test`), para no compartir estado con el entorno de desarrollo:

```bash
cp .env.test.example .env.test
docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from test
```

El contenedor `test` migra automáticamente `db-test` y luego ejecuta Jest (`pnpm run test:ci`).

Para limpiar el contenedor/volumen de test:

```bash
docker compose -f docker-compose.test.yml down -v
```

## Desarrollo sin Docker

Requiere Node 22+, pnpm y un Postgres accesible via `DATABASE_URL`.

```bash
pnpm install
cp .env.example .env
pnpm migrate:up
pnpm dev
```

## Estilo de código (Prettier)

El proyecto usa [Prettier](https://prettier.io) (config en `.prettierrc.json`) para que todo el equipo formatee igual sin discutirlo caso a caso:

```bash
pnpm format        # reformatea todo el proyecto
pnpm format:check  # solo comprueba, no modifica (útil en CI)
```

Configura tu editor para formatear al guardar con Prettier, o ejecuta `pnpm format` antes de cada commit.

## Integración continua (GitHub Actions)

`.github/workflows/ci.yml` corre en cada Pull Request (y en push a `main`):

- **lint**: `make lint` (Prettier en modo check, sin Docker).
- **test**: `make test` con Docker Compose (misma suite que en local, contra Postgres real).

## Scripts

| Script                | Descripción                                  |
| --------------------- | -------------------------------------------- |
| `pnpm dev`            | Arranca el servidor con hot-reload (nodemon) |
| `pnpm start`          | Arranca el servidor en modo producción       |
| `pnpm migrate:up`     | Aplica migraciones pendientes                |
| `pnpm migrate:down`   | Revierte la última migración                 |
| `pnpm migrate:create` | Crea un nuevo fichero de migración           |
| `pnpm test`           | Ejecuta los tests con Jest                   |
| `pnpm test:ci`        | Migra la BD de test y ejecuta los tests      |
| `pnpm format`         | Reformatea todo el proyecto con Prettier     |
| `pnpm format:check`   | Comprueba el formato sin modificar archivos  |

## Añadir un nuevo recurso

1. Crea el esquema AJV en `src/schemas/<recurso>.schema.js` (añade `tags`/`summary`/`security` para que aparezca bien documentado en `/reference`).
2. Crea los handlers en `src/handlers/<recurso>.handlers.js`.
3. Crea las rutas en `src/routes/<recurso>.routes.js` (se autocargan).
4. Crea la migración con `pnpm migrate:create <nombre>` y aplícala con `pnpm migrate:up`.
5. Crea `rest/<recurso>.rest` con las peticiones de ejemplo para ese recurso.
