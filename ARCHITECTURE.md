# Arquitectura del Proyecto

Este documento explica la estructura del proyecto y cómo agregar nuevas features.

## 📂 Estructura General

```
src/
├── features/              # Features (módulos de negocio)
├── shared/                # Código compartido
├── plugins/               # Plugins de Fastify
├── config/                # Configuración centralizada
├── app.js                 # Factory de la aplicación
└── server.js              # Punto de entrada
```

---

## 📋 Descripción de Carpetas

### `src/features/` - Features del Negocio

Cada feature es un módulo independiente con su propia lógica de negocio. Ejemplo: `auth`, `users`, `products`.

**Estructura de un feature:**

```
features/
├── auth/
│   ├── auth.controller.ts          # Manejadores de requests HTTP
│   ├── auth.routes.ts              # Definición de endpoints
│   ├── auth.schema.ts              # Validaciones (JSON Schema)
│   ├── identity.repository.ts      # Acceso a datos: identidades
│   ├── identity.service.ts         # Lógica de negocio: identidades
│   ├── refresh-token.repository.ts # Acceso a datos: refresh tokens
│   ├── token.service.ts            # Lógica de negocio: tokens
│   └── exceptions.ts               # Errores específicos de auth
├── users/
│   ├── user.controller.ts
│   ├── user.routes.ts
│   ├── user.schema.ts
│   ├── user.repository.ts
│   ├── user.service.ts
│   └── exceptions.ts
├── health/
│   └── health.routes.ts
└── providers/
    └── google.ts                   # Integraciones externas
```

### `src/shared/` - Código Compartido

Código reutilizable entre features.

- **`exceptions/app-exception.ts`** - Clase base para todas las excepciones personalizadas
- **`schemas/common.schema.ts`** - Schemas comunes (errores, etc.)
- **`types.ts`** - Tipos/interfaces compartidas (User, Identity, RefreshToken, OAuthProfile, Queryable)
- **`utils/`** - Funciones utilitarias (futuro)

### `src/plugins/` - Plugins de Fastify

Extensiones y middlewares de Fastify.

- **`db.ts`** - Conexión a PostgreSQL
- **`jwt.ts`** - Autenticación con JWT
- **`cors.ts`** - CORS configuration
- **`rate-limit.ts`** - Rate limiting
- **`authorization.ts`** - Verificación de permisos
- **`swagger.ts`** - Documentación OpenAPI
- **`error-handler.ts`** - Manejo centralizado de errores
- **`schemas.ts`** - Registro de schemas comunes

### `src/config/` - Configuración

- **`index.ts`** - Variables de entorno validadas con **Zod** (tipadas con Config interface)

### `src/types/` - Declaraciones de Tipos

- **`fastify.d.ts`** - Augmentación de módulos para Fastify, FastifyJWT y variables de entorno

### Archivos Raíz

- **`src/app.ts`** - Factory que construye la instancia de Fastify
- **`src/server.ts`** - Punto de entrada: inicia la app

---

## 🔄 Flujo de un Request

```
Request HTTP
    ↓
auth.routes.ts         (define ruta + schema)
    ↓
auth.controller.ts     (parsea request, maneja respuesta)
    ↓
identity.service.ts    (lógica de negocio)
    ↓
identity.repository.ts (acceso a base de datos)
    ↓
PostgreSQL
    ↓
Response JSON
```

---

## 🎯 Responsabilidades de Cada Capa

### Controller (`.controller.ts`)

**Responsabilidad:** Manejar la lógica HTTP (request/response). Tipado con genéricos de Fastify.

```typescript
// src/features/auth/auth.controller.ts
import type { FastifyRequest, FastifyReply } from "fastify";

interface GoogleLoginRequest extends FastifyRequest {
  body: { id_token: string };
}

export async function googleLogin(request: GoogleLoginRequest, reply: FastifyReply): Promise<void> {
  const { id_token: idToken } = request.body; // Parsear input (tipado)

  let profile;
  try {
    profile = await verifyGoogleIdToken(idToken);
  } catch (err) {
    reply.status(401).send({ error: "Unauthorized", message: "Invalid Google token" });
    return;
  }

  const user = await identityService.findOrCreateUserFromIdentity(request.server.pg, profile);

  const accessToken = await reply.jwtSign({ id: user.id, email: user.email });
  reply.status(200).send({ accessToken, user }); // Enviar response
}
```

**Tareas:**

- ✅ Extraer datos del request (`request.body`, `request.params`, etc.)
- ✅ Llamar a servicios con lógica de negocio
- ✅ Manejar errores y retornar códigos HTTP apropiados
- ✅ Formatear y enviar la respuesta
- ✅ Tipar argumentos y retorno

### Service (`.service.ts`)

**Responsabilidad:** Lógica de negocio y orquestación de datos.

```typescript
// src/features/users/user.service.ts
import type { Queryable, User } from "../../shared/types.js";
import { UserNotFoundError } from "./exceptions.js";
import * as userRepository from "./user.repository.js";

export async function getUserById(pg: Queryable, userId: string): Promise<User> {
  const user = await userRepository.findById(pg, userId);
  if (!user) {
    throw new UserNotFoundError(userId); // Lanzar excepción
  }
  return user;
}

export async function createUser(
  pg: Queryable,
  userData: { name: string; email: string; avatarUrl: string | null },
): Promise<User> {
  // Validaciones de negocio (ejemplo)
  if (!userData.email) {
    throw new Error("Email is required");
  }

  return userRepository.create(pg, userData);
}
```

**Tareas:**

- ✅ Aplicar reglas de negocio
- ✅ Validar datos (lógica de negocio, no entrada)
- ✅ Orquestar múltiples repositorios
- ✅ Lanzar excepciones personalizadas
- ✅ Tipar argumentos, retornos y datos

### Repository (`.repository.ts`)

**Responsabilidad:** Acceso a datos. Cualquier operación con BD pasa por aquí.

```typescript
// src/features/users/user.repository.ts
import type { Queryable, User } from "../../shared/types.js";

export async function findById(pg: Queryable, userId: string): Promise<User | null> {
  const { rows } = await pg.query(
    "SELECT id, name, email, avatar_url, created_at FROM users WHERE id = $1",
    [userId],
  );
  const row = rows[0] as any;
  return row
    ? {
        id: row.id,
        name: row.name,
        email: row.email,
        avatarUrl: row.avatar_url,
        createdAt: new Date(row.created_at),
      }
    : null;
}

export async function create(
  pg: Queryable,
  userData: { name: string; email: string; avatarUrl: string | null },
): Promise<User> {
  const { rows } = await pg.query(
    "INSERT INTO users (name, email, avatar_url) VALUES ($1, $2, $3) RETURNING id, name, email, avatar_url, created_at",
    [userData.name, userData.email, userData.avatarUrl],
  );
  const row = rows[0] as any;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatar_url,
    createdAt: new Date(row.created_at),
  };
}
```

**Tareas:**

- ✅ Ejecutar queries SQL
- ✅ Transformar resultados de BD en tipos del dominio
- ✅ No contiene lógica de negocio
- ✅ Tipar retornos

### Schema (`.schema.ts`)

**Responsabilidad:** Validar entrada (JSON Schema) y documentar endpoints.

```typescript
// src/features/auth/auth.schema.ts
export const googleLoginSchema = {
  tags: ["auth"],
  summary: "Login/registro con Google",
  description: "Verifica un id_token de Google...",
  body: {
    type: "object",
    required: ["id_token"],
    additionalProperties: false,
    properties: {
      id_token: { type: "string", minLength: 1 },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        refreshToken: { type: "string" },
        user: { type: "object", properties: userProperties },
      },
    },
    401: { $ref: "errorResponse#" },
  },
} as const;
```

**Tareas:**

- ✅ Validar entrada del usuario
- ✅ Documentar respuestas (Swagger)
- ✅ Validación automática en Fastify

### Routes (`.routes.ts`)

**Responsabilidad:** Conectar endpoints con controllers.

```typescript
// src/features/auth/auth.routes.ts
import type { FastifyInstance } from "fastify";
import * as authController from "./auth.controller.js";
import { googleLoginSchema, meSchema } from "./auth.schema.js";

export default async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post("/auth/google", { schema: googleLoginSchema }, authController.googleLogin);

  fastify.get(
    "/auth/me",
    { schema: meSchema, preHandler: [fastify.authenticate] },
    authController.getMe,
  );
}
```

**Tareas:**

- ✅ Definir método HTTP (GET, POST, etc.)
- ✅ Definir ruta
- ✅ Asociar schema de validación
- ✅ Asociar middlewares (autenticación, rate limit)
- ✅ Conectar con controller

### Exceptions (`.exceptions.ts`)

**Responsabilidad:** Excepciones personalizadas del feature, extienden AppException.

```typescript
// src/features/users/exceptions.ts
import { AppException } from "../../shared/exceptions/app-exception.js";

export class UserNotFoundError extends AppException {
  constructor(userId: string) {
    super(`User not found with id '${userId}'`, 404);
  }
}
```

---

## 🚀 Implementar una Nueva Feature

### Ejemplo: Agregar feature `products`

#### 1. Crear estructura de carpetas

```bash
mkdir -p src/features/products
cd src/features/products
```

#### 2. Crear tipos de dominio en `src/shared/types.ts` (si no existen)

Añade:

```typescript
export interface Product {
  id: string;
  name: string;
  price: number;
  createdAt: Date;
}
```

#### 3. Crear `product.repository.ts`

```typescript
// src/features/products/product.repository.ts
import type { Queryable, Product } from "../../shared/types.js";

export async function findAll(pg: Queryable): Promise<Product[]> {
  const { rows } = await pg.query("SELECT id, name, price, created_at FROM products");
  return (rows as any[]).map((row) => ({
    id: row.id,
    name: row.name,
    price: row.price,
    createdAt: new Date(row.created_at),
  }));
}

export async function findById(pg: Queryable, productId: string): Promise<Product | null> {
  const { rows } = await pg.query(
    "SELECT id, name, price, created_at FROM products WHERE id = $1",
    [productId],
  );
  const row = rows[0] as any;
  return row
    ? {
        id: row.id,
        name: row.name,
        price: row.price,
        createdAt: new Date(row.created_at),
      }
    : null;
}

export async function create(
  pg: Queryable,
  productData: { name: string; price: number },
): Promise<Product> {
  const { rows } = await pg.query(
    "INSERT INTO products (name, price) VALUES ($1, $2) RETURNING id, name, price, created_at",
    [productData.name, productData.price],
  );
  const row = rows[0] as any;
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    createdAt: new Date(row.created_at),
  };
}
```

#### 4. Crear `exceptions.ts`

```typescript
// src/features/products/exceptions.ts
import { AppException } from "../../shared/exceptions/app-exception.js";

export class ProductNotFoundError extends AppException {
  constructor(productId: string) {
    super(`Product not found with id '${productId}'`, 404);
  }
}

export class InvalidPriceError extends AppException {
  constructor() {
    super("Price must be greater than 0", 400);
  }
}
```

#### 5. Crear `product.service.ts`

```typescript
// src/features/products/product.service.ts
import type { Queryable, Product } from "../../shared/types.js";
import * as productRepository from "./product.repository.js";
import { ProductNotFoundError, InvalidPriceError } from "./exceptions.js";

export async function getProducts(pg: Queryable): Promise<Product[]> {
  return productRepository.findAll(pg);
}

export async function getProductById(pg: Queryable, productId: string): Promise<Product> {
  const product = await productRepository.findById(pg, productId);
  if (!product) {
    throw new ProductNotFoundError(productId);
  }
  return product;
}

export async function createProduct(
  pg: Queryable,
  productData: { name: string; price: number },
): Promise<Product> {
  if (productData.price < 0) {
    throw new InvalidPriceError();
  }
  return productRepository.create(pg, productData);
}
```

#### 6. Crear `product.controller.ts`

```typescript
// src/features/products/product.controller.ts
import type { FastifyRequest, FastifyReply } from "fastify";
import * as productService from "./product.service.js";

interface GetProductRequest extends FastifyRequest {
  params: { id: string };
}

interface CreateProductRequest extends FastifyRequest {
  body: { name: string; price: number };
}

export async function listProducts(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const products = await productService.getProducts(request.server.pg);
  reply.send(products);
}

export async function getProduct(request: GetProductRequest, reply: FastifyReply): Promise<void> {
  const product = await productService.getProductById(request.server.pg, request.params.id);
  reply.send(product);
}

export async function createProduct(
  request: CreateProductRequest,
  reply: FastifyReply,
): Promise<void> {
  const product = await productService.createProduct(request.server.pg, request.body);
  reply.status(201).send(product);
}
```

#### 7. Crear `product.schema.ts`

```typescript
// src/features/products/product.schema.ts
const productProperties = {
  id: { type: "string", format: "uuid" },
  name: { type: "string" },
  price: { type: "number", minimum: 0 },
  created_at: { type: "string", format: "date-time" },
} as const;

export const listProductsSchema = {
  tags: ["products"],
  summary: "Listar productos",
  response: {
    200: {
      type: "array",
      items: { type: "object", properties: productProperties },
    },
  },
} as const;

export const getProductSchema = {
  tags: ["products"],
  summary: "Obtener un producto",
  params: {
    type: "object",
    required: ["id"],
    properties: { id: { type: "string", format: "uuid" } },
  },
  response: {
    200: { type: "object", properties: productProperties },
    404: { $ref: "errorResponse#" },
  },
} as const;

export const createProductSchema = {
  tags: ["products"],
  summary: "Crear producto",
  body: {
    type: "object",
    required: ["name", "price"],
    additionalProperties: false,
    properties: {
      name: { type: "string", minLength: 1 },
      price: { type: "number", minimum: 0 },
    },
  },
  response: {
    201: { type: "object", properties: productProperties },
    400: { $ref: "errorResponse#" },
  },
} as const;
```

#### 8. Crear `product.routes.ts`

```typescript
// src/features/products/product.routes.ts
import type { FastifyInstance } from "fastify";
import * as productController from "./product.controller.js";
import { listProductsSchema, getProductSchema, createProductSchema } from "./product.schema.js";

export default async function productRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get("/products", { schema: listProductsSchema }, productController.listProducts);

  fastify.get("/products/:id", { schema: getProductSchema }, productController.getProduct);

  fastify.post(
    "/products",
    { schema: createProductSchema, preHandler: [fastify.authenticate] },
    productController.createProduct,
  );
}
```

#### 9. Registrar las rutas en `src/app.ts`

```typescript
// En src/app.ts, agregar (después de importar):
import productRoutes from "./features/products/product.routes.js";

// Y en la función build():
await fastify.register(productRoutes);
```

#### 10. Crear la migración

```bash
pnpm migrate:create add_products_table
```

Luego edita `migrations/<timestamp>_add_products_table.ts`:

```typescript
import type { MigrationBuilder } from "node-pg-migrate";

export const up = (pgm: MigrationBuilder): void => {
  pgm.createTable("products", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    name: { type: "varchar(255)", notNull: true },
    price: { type: "numeric(10,2)", notNull: true },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.dropTable("products");
};
```

Aplica la migración:

```bash
pnpm migrate:up
```

#### 11. ¡Listo!

La feature está lista. Los endpoints estarán disponibles en:

- `GET /products` - Listar todos
- `GET /products/:id` - Obtener uno
- `POST /products` - Crear nuevo (requiere autenticación)

---

## 📝 Checklist para una Nueva Feature

- [ ] Crear carpeta `src/features/nombre/`
- [ ] Crear tipos en `src/shared/types.ts` (si es necesario)
- [ ] Crear `nombre.repository.ts` - Acceso a datos (tipado)
- [ ] Crear `nombre.service.ts` - Lógica de negocio (tipado)
- [ ] Crear `exceptions.ts` - Errores personalizados (extienden AppException)
- [ ] Crear `nombre.controller.ts` - Manejadores HTTP (tipados con FastifyRequest/Reply)
- [ ] Crear `nombre.schema.ts` - Validaciones y docs (JSON Schema)
- [ ] Crear `nombre.routes.ts` - Definir endpoints (async, return Promise<void>)
- [ ] Registrar rutas en `src/app.ts` (await fastify.register)
- [ ] Crear migración (pnpm migrate:create) y aplicar (pnpm migrate:up)
- [ ] Escribir tests en `test/nombre.test.ts` (opcional pero recomendado)
- [ ] Crear `rest/nombre.rest` para pruebas manuales (opcional)

---

## 🔍 Patrones Comunes

### Manejar errores en controller

```typescript
import type { FastifyRequest, FastifyReply } from "fastify";

interface CreateUserRequest extends FastifyRequest {
  body: { email: string; name: string };
}

export async function createUser(request: CreateUserRequest, reply: FastifyReply): Promise<void> {
  try {
    const user = await userService.createUser(request.server.pg, request.body);
    reply.status(201).send(user);
  } catch (err) {
    if (err instanceof DuplicateEmailError) {
      reply.status(400).send({ error: "Bad Request", message: err.message });
      return;
    }
    throw err; // Dejar que error-handler.ts lo maneje
  }
}
```

### Usar transacciones en service

```typescript
import type { PoolClient } from "pg";
import type { Queryable } from "../../shared/types.js";

export async function createUserWithProfile(
  pg: Queryable & { connect?(): Promise<PoolClient> },
  userData: { name: string; email: string; profileData: unknown },
): Promise<User> {
  const client = await (pg as any).connect();
  try {
    await client.query("BEGIN");

    const user = await userRepository.create(client as Queryable, userData);
    await profileRepository.create(client as Queryable, user.id, userData.profileData);

    await client.query("COMMIT");
    return user;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
```

### Reutilizar schemas comunes

```typescript
// En product.schema.ts
import { userProperties } from "../users/user.schema.js";

export const productWithOwnerSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    name: { type: "string" },
    owner: { type: "object", properties: userProperties },
  },
} as const;
```

### Tipar genéricos de Fastify

```typescript
// En auth.routes.ts
import type { FastifyInstance, FastifyRequest } from "fastify";

interface LoginBody {
  email: string;
  password: string;
}

export default async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post<{ Body: LoginBody }>(
    "/auth/login",
    { schema: loginSchema },
    async (request, reply) => {
      const { email, password } = request.body; // Tipado como LoginBody
      // ...
    },
  );
}
```
