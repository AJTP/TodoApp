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
│   ├── auth.controller.js          # Manejadores de requests HTTP
│   ├── auth.routes.js              # Definición de endpoints
│   ├── auth.schema.js              # Validaciones (JSON Schema)
│   ├── identity.repository.js      # Acceso a datos: identidades
│   ├── identity.service.js         # Lógica de negocio: identidades
│   ├── refresh-token.repository.js # Acceso a datos: refresh tokens
│   ├── token.service.js            # Lógica de negocio: tokens
│   └── exceptions.js               # Errores específicos de auth
├── users/
│   ├── user.controller.js
│   ├── user.routes.js
│   ├── user.schema.js
│   ├── user.repository.js
│   ├── user.service.js
│   └── exceptions.js
├── health/
│   └── health.routes.js
└── providers/
    └── google.js                   # Integraciones externas
```

### `src/shared/` - Código Compartido

Código reutilizable entre features.

- **`exceptions/app-exception.js`** - Clase base para todas las excepciones personalizadas
- **`schemas/common.schema.js`** - Schemas comunes (errores, etc.)
- **`types/`** - Tipos/interfaces compartidas (futuro)
- **`utils/`** - Funciones utilitarias (futuro)

### `src/plugins/` - Plugins de Fastify

Extensiones y middlewares de Fastify.

- **`db.js`** - Conexión a PostgreSQL
- **`jwt.js`** - Autenticación con JWT
- **`cors.js`** - CORS configuration
- **`rate-limit.js`** - Rate limiting
- **`authorization.js`** - Verificación de permisos
- **`swagger.js`** - Documentación OpenAPI
- **`error-handler.js`** - Manejo centralizado de errores
- **`schemas.js`** - Registro de schemas comunes

### `src/config/` - Configuración

- **`index.js`** - Variables de entorno y configuración centralizada

### Archivos Raíz

- **`src/app.js`** - Factory que construye la instancia de Fastify
- **`src/server.js`** - Punto de entrada: inicia la app

---

## 🔄 Flujo de un Request

```
Request HTTP
    ↓
auth.routes.js         (define ruta + schema)
    ↓
auth.controller.js     (parsea request, maneja respuesta)
    ↓
identity.service.js    (lógica de negocio)
    ↓
identity.repository.js (acceso a base de datos)
    ↓
PostgreSQL
    ↓
Response JSON
```

---

## 🎯 Responsabilidades de Cada Capa

### Controller (`.controller.js`)

**Responsabilidad:** Manejar la lógica HTTP (request/response).

```javascript
// src/features/auth/auth.controller.js
async function googleLogin(request, reply) {
  const { id_token: idToken } = request.body; // Parsear input

  try {
    const profile = await verifyGoogleIdToken(idToken);
  } catch (err) {
    return reply.status(401).send({ error: "Invalid token" });
  }

  const user = await identityService.findOrCreateUserFromIdentity(request.server.pg, profile);

  const accessToken = await reply.jwtSign({ id: user.id, email: user.email });
  return reply.status(200).send({ accessToken, user }); // Enviar response
}
```

**Tareas:**

- ✅ Extraer datos del request (`request.body`, `request.params`, etc.)
- ✅ Llamar a servicios con lógica de negocio
- ✅ Manejar errores y retornar códigos HTTP apropiados
- ✅ Formatear y enviar la respuesta

### Service (`.service.js`)

**Responsabilidad:** Lógica de negocio y orquestación de datos.

```javascript
// src/features/users/user.service.js
async function getUserById(pg, userId) {
  const user = await userRepository.findById(pg, userId);
  if (!user) {
    throw new UserNotFoundError(userId); // Lanzar excepción
  }
  return user;
}

async function createUser(pg, userData) {
  // Validaciones de negocio
  const exists = await userRepository.findByEmail(pg, userData.email);
  if (exists) throw new UserAlreadyExistsError();

  return userRepository.create(pg, userData);
}
```

**Tareas:**

- ✅ Aplicar reglas de negocio
- ✅ Validar datos (lógica de negocio, no entrada)
- ✅ Orquestar múltiples repositorios
- ✅ Lanzar excepciones personalizadas

### Repository (`.repository.js`)

**Responsabilidad:** Acceso a datos. Cualquier operación con BD pasa por aquí.

```javascript
// src/features/users/user.repository.js
async function findById(pg, userId) {
  const { rows } = await pg.query("SELECT id, name, email FROM users WHERE id = $1", [userId]);
  return rows[0] || null;
}

async function create(pg, userData) {
  const { rows } = await pg.query("INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *", [
    userData.name,
    userData.email,
  ]);
  return rows[0];
}
```

**Tareas:**

- ✅ Ejecutar queries SQL
- ✅ Transformar resultados de BD
- ✅ No contiene lógica de negocio

### Schema (`.schema.js`)

**Responsabilidad:** Validar entrada (JSON Schema) y documentar endpoints.

```javascript
// src/features/auth/auth.schema.js
const googleLoginSchema = {
  tags: ["auth"],
  summary: "Login con Google",
  body: {
    type: "object",
    required: ["id_token"],
    properties: {
      id_token: { type: "string", minLength: 1 },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        user: {/* ... */},
      },
    },
    401: { $ref: "errorResponse#" },
  },
};
```

**Tareas:**

- ✅ Validar entrada del usuario
- ✅ Documentar respuestas (Swagger)
- ✅ Validación automática en Fastify

### Routes (`.routes.js`)

**Responsabilidad:** Conectar endpoints con controllers.

```javascript
// src/features/auth/auth.routes.js
module.exports = async function authRoutes(fastify) {
  fastify.post(
    "/auth/google",
    { schema: googleLoginSchema, config: { rateLimit: authRateLimit } },
    authController.googleLogin,
  );

  fastify.get(
    "/auth/me",
    { schema: meSchema, preHandler: [fastify.authenticate] },
    authController.getMe,
  );
};
```

**Tareas:**

- ✅ Definir método HTTP (GET, POST, etc.)
- ✅ Definir ruta
- ✅ Asociar schema de validación
- ✅ Asociar middlewares (autenticación, rate limit)
- ✅ Conectar con controller

### Exceptions (`.exceptions.js`)

**Responsabilidad:** Excepciones personalizadas del feature.

```javascript
// src/features/users/exceptions.js
const AppException = require("../../shared/exceptions/app-exception");

class UserNotFoundError extends AppException {
  constructor(userId) {
    super(`User not found with id '${userId}'`, 404);
  }
}

module.exports = { UserNotFoundError };
```

---

## 🚀 Implementar una Nueva Feature

### Ejemplo: Agregar feature `products`

#### 1. Crear estructura de carpetas

```bash
mkdir -p src/features/products
cd src/features/products
```

#### 2. Crear `product.repository.js`

```javascript
// src/features/products/product.repository.js
"use strict";

async function findAll(pg) {
  const { rows } = await pg.query("SELECT id, name, price FROM products");
  return rows;
}

async function findById(pg, productId) {
  const { rows } = await pg.query("SELECT id, name, price FROM products WHERE id = $1", [
    productId,
  ]);
  return rows[0] || null;
}

async function create(pg, productData) {
  const { name, price } = productData;
  const { rows } = await pg.query(
    "INSERT INTO products (name, price) VALUES ($1, $2) RETURNING id, name, price",
    [name, price],
  );
  return rows[0];
}

module.exports = {
  findAll,
  findById,
  create,
};
```

#### 3. Crear `product.service.js`

```javascript
// src/features/products/product.service.js
"use strict";

const productRepository = require("./product.repository");
const { ProductNotFoundError } = require("./exceptions");

async function getProducts(pg) {
  return productRepository.findAll(pg);
}

async function getProductById(pg, productId) {
  const product = await productRepository.findById(pg, productId);
  if (!product) {
    throw new ProductNotFoundError(productId);
  }
  return product;
}

async function createProduct(pg, productData) {
  // Validaciones de negocio
  if (productData.price < 0) {
    throw new InvalidPriceError();
  }
  return productRepository.create(pg, productData);
}

module.exports = {
  getProducts,
  getProductById,
  createProduct,
};
```

#### 4. Crear `exceptions.js`

```javascript
// src/features/products/exceptions.js
"use strict";

const AppException = require("../../shared/exceptions/app-exception");

class ProductNotFoundError extends AppException {
  constructor(productId) {
    super(`Product not found with id '${productId}'`, 404);
  }
}

class InvalidPriceError extends AppException {
  constructor() {
    super("Price must be greater than 0", 400);
  }
}

module.exports = {
  ProductNotFoundError,
  InvalidPriceError,
};
```

#### 5. Crear `product.controller.js`

```javascript
// src/features/products/product.controller.js
"use strict";

const productService = require("./product.service");

async function listProducts(request, reply) {
  const products = await productService.getProducts(request.server.pg);
  return reply.send(products);
}

async function getProduct(request, reply) {
  const product = await productService.getProductById(request.server.pg, request.params.id);
  return reply.send(product);
}

async function createProduct(request, reply) {
  const product = await productService.createProduct(request.server.pg, request.body);
  return reply.status(201).send(product);
}

module.exports = {
  listProducts,
  getProduct,
  createProduct,
};
```

#### 6. Crear `product.schema.js`

```javascript
// src/features/products/product.schema.js
"use strict";

const productProperties = {
  id: { type: "string", format: "uuid" },
  name: { type: "string" },
  price: { type: "number", minimum: 0 },
};

const listProductsSchema = {
  tags: ["products"],
  summary: "Listar productos",
  response: {
    200: {
      type: "array",
      items: { type: "object", properties: productProperties },
    },
  },
};

const getProductSchema = {
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
};

const createProductSchema = {
  tags: ["products"],
  summary: "Crear producto",
  body: {
    type: "object",
    required: ["name", "price"],
    properties: {
      name: { type: "string" },
      price: { type: "number", minimum: 0 },
    },
  },
  response: {
    201: { type: "object", properties: productProperties },
    400: { $ref: "errorResponse#" },
  },
};

module.exports = {
  listProductsSchema,
  getProductSchema,
  createProductSchema,
};
```

#### 7. Crear `product.routes.js`

```javascript
// src/features/products/product.routes.js
"use strict";

const productController = require("./product.controller");
const { listProductsSchema, getProductSchema, createProductSchema } = require("./product.schema");

module.exports = async function productRoutes(fastify) {
  fastify.get("/products", { schema: listProductsSchema }, productController.listProducts);

  fastify.get("/products/:id", { schema: getProductSchema }, productController.getProduct);

  fastify.post(
    "/products",
    { schema: createProductSchema, preHandler: [fastify.authenticate] },
    productController.createProduct,
  );
};
```

#### 8. Registrar las rutas en `src/app.js`

```javascript
// En src/app.js, agregar:
fastify.register(require("./features/products/product.routes"));
```

#### 9. ¡Listo!

La feature está lista. Los endpoints estarán disponibles en:

- `GET /products` - Listar todos
- `GET /products/:id` - Obtener uno
- `POST /products` - Crear nuevo

---

## 📝 Checklist para una Nueva Feature

- [ ] Escribir tests (opcional pero recomendado)
- [ ] Crear carpeta `src/features/nombre/`
- [ ] Crear `nombre.repository.js` - Acceso a datos
- [ ] Crear `nombre.service.js` - Lógica de negocio
- [ ] Crear `exceptions.js` - Errores personalizados
- [ ] Crear `nombre.controller.js` - Manejadores HTTP
- [ ] Crear `nombre.schema.js` - Validaciones y docs
- [ ] Crear `nombre.routes.js` - Definir endpoints
- [ ] Registrar rutas en `src/app.js`

---

## 🔍 Patrones Comunes

### Manejar errores en controller

```javascript
async function createUser(request, reply) {
  try {
    const user = await userService.createUser(request.server.pg, request.body);
    return reply.status(201).send(user);
  } catch (err) {
    if (err instanceof DuplicateEmailError) {
      return reply.status(400).send({ error: err.message });
    }
    throw err; // Dejar que error-handler.js lo maneje
  }
}
```

### Usar transacciones en service

```javascript
async function createUserWithProfile(pg, userData) {
  const client = await pg.connect();
  try {
    await client.query("BEGIN");

    const user = await userRepository.create(client, userData);
    await profileRepository.create(client, user.id, userData.profile);

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

```javascript
// En product.schema.js
const { userProperties } = require("../users/user.schema");

const productWithOwnerSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    owner: { type: "object", properties: userProperties },
  },
};
```
