"use strict";

const fp = require("fastify-plugin");

module.exports = fp(async function authorizationPlugin(fastify) {
  fastify.decorate("ensureOwnParams", function (idParam = "id") {
    return async function (request, reply) {
      if (request.user.id !== request.params[idParam]) {
        reply.status(403).send({ error: "Forbidden", message: "You cannot access this resource" });
      }
    };
  });
});
