# TodoApp API

Este proyecto se trata de una pequeña toma de contacto con el lenguaje de programación TypeScript

## Inicio rápido (make)

El proyecto incluye un `Makefile` con los comandos más habituales, para no memorizar los `docker compose` largos:

```bash
make up             # crea .env/.env.test si no existen y levanta backend + db
make migrate-up     # aplica migraciones dentro del contenedor backend
make test           # vitest en modo watch + UI (http://localhost:51204) en su contenedor aislado
make test-ci        # corre los tests una sola vez (modo CI) en su contenedor aislado
make down           # detiene y elimina los contenedores de desarrollo
make help           # lista todos los comandos disponibles
```

Por defecto usa el binario `docker-compose`. Si en tu máquina tienes el plugin moderno `docker compose` (con espacio), pasa `DC="docker compose"` (o cambia el valor por defecto al principio del `Makefile`):

```bash
make up DC="docker compose"
```

## Autenticación e identidades

El login funciona por proveedores de identidad externos:

- `users`: el perfil de la cuenta (`id`, `name`, `email`, `avatar_url`).
- `identities`: qué proveedores tiene vinculados cada usuario (`provider`, `provider_user_id`, `user_id`), con `(provider, provider_user_id)` único.
- `refresh_tokens`: refresh tokens opacos (no JWT) por usuario, con hash guardado (no el valor en claro), fecha de expiración y revocación — independientes del proveedor usado para el login.

Cada login (`POST /auth/google`) devuelve `{ accessToken, refreshToken, user }`. El `accessToken` (JWT, corta duración vía `JWT_EXPIRES_IN`) se usa en `Authorization: Bearer` para las rutas protegidas. Cuando expira, `POST /auth/refresh` con `{ refresh_token }` devuelve un par nuevo `{ accessToken, refreshToken }` y **revoca el refresh token usado** (rotación): cada refresh token solo sirve una vez, así que si se reutiliza uno ya rotado (p. ej. porque fue robado), la petición falla con 401.
