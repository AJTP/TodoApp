import { userProperties } from "../users/user.schema.js";

const tokenPairProperties = {
  accessToken: { type: "string" },
  refreshToken: { type: "string" },
} as const;

export const googleLoginSchema = {
  tags: ["auth"],
  summary: "Login/registro con Google",
  description:
    "Verifica un id_token de Google, crea o vincula el usuario y devuelve un accessToken (JWT) y un refreshToken.",
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
        ...tokenPairProperties,
        user: {
          type: "object",
          properties: userProperties,
        },
      },
    },
    400: { $ref: "errorResponse#" },
    401: { $ref: "errorResponse#" },
  },
} as const;

export const meSchema = {
  tags: ["auth"],
  summary: "Perfil del usuario autenticado",
  security: [{ bearerAuth: [] }],
  response: {
    200: {
      type: "object",
      properties: userProperties,
    },
    401: { $ref: "errorResponse#" },
    404: { $ref: "errorResponse#" },
  },
} as const;

export const refreshSchema = {
  tags: ["auth"],
  summary: "Refresca el access token",
  description:
    "Rota el refresh token recibido: lo revoca y emite un nuevo par accessToken/refreshToken. Independiente del proveedor usado para el login original.",
  body: {
    type: "object",
    required: ["refresh_token"],
    additionalProperties: false,
    properties: {
      refresh_token: { type: "string", minLength: 1 },
    },
  },
  response: {
    200: {
      type: "object",
      properties: tokenPairProperties,
    },
    401: { $ref: "errorResponse#" },
  },
} as const;

export const logoutSchema = {
  tags: ["auth"],
  summary: "Cierra sesión en todos los dispositivos",
  description:
    "Revoca todos los refresh tokens vivos del usuario autenticado. El accessToken en curso sigue siendo válido hasta que expire (JWT_EXPIRES_IN), pero ya no podrá renovarse.",
  security: [{ bearerAuth: [] }],
  response: {
    204: { type: "null" },
    401: { $ref: "errorResponse#" },
  },
} as const;
