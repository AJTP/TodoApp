"use strict";

module.exports = async function healthRoutes(fastify) {
  fastify.get("/health", async (request, reply) => {
    return reply.send({ status: "ok" });
  });
};
