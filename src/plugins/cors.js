"use strict";

const fp = require("fastify-plugin");
const fastifyCors = require("@fastify/cors");
const config = require("../config");

module.exports = fp(async function corsPlugin(fastify) {
  await fastify.register(fastifyCors, {
    origin: config.corsOrigin,
  });
});
