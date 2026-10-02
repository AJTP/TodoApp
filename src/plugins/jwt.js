"use strict";

const fp = require("fastify-plugin");
const fastifyJwt = require("@fastify/jwt");
const config = require("../config");

module.exports = fp(async function jwtPlugin(fastify) {
  fastify.register(fastifyJwt, {
    secret: config.jwtSecret,
    sign: { expiresIn: config.jwtExpiresIn },
  });

  fastify.decorate("authenticate", async function (request, reply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: "Unauthorized", message: "Invalid or expired token" });
    }
  });
});
