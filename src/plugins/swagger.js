"use strict";

const fp = require("fastify-plugin");
const fastifySwagger = require("@fastify/swagger");
const config = require("../config");

module.exports = fp(async function swaggerPlugin(fastify) {
  if (config.isTest) {
    return;
  }

  await fastify.register(fastifySwagger, {
    openapi: {
      info: {
        title: "Backend Boilerplate API",
        description:
          "API de autenticación con proveedores de identidad (Google, ...) y refresh tokens.",
        version: "1.0.0",
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
  });

  // @scalar/fastify-api-reference es un paquete ESM puro; en un proyecto
  // CommonJS hay que cargarlo con import() dinámico. Lee automáticamente el
  // documento OpenAPI generado por @fastify/swagger (registrado arriba).
  const { default: scalarApiReference } = await import("@scalar/fastify-api-reference");

  await fastify.register(scalarApiReference, {
    routePrefix: "/reference",
  });
});
