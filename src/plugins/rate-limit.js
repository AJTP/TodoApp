"use strict";

const fp = require("fastify-plugin");
const fastifyRateLimit = require("@fastify/rate-limit");

// global: false -> no limita nada por defecto; cada ruta que quiera límite
// lo declara explícitamente con `config: { rateLimit: { ... } }` (ver
// src/routes/auth.routes.js para /auth/google y /auth/refresh).
module.exports = fp(async function rateLimitPlugin(fastify) {
  await fastify.register(fastifyRateLimit, {
    global: false,
  });
});
