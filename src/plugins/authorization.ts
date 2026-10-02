import fp from "fastify-plugin";
import type { FastifyMiddleware } from "fastify";

export default fp(async function authorizationPlugin(fastify) {
  fastify.decorate("ensureOwnParams", function (idParam = "id"): FastifyMiddleware {
    return async function (request, reply) {
      if (request.user.id !== request.params[idParam]) {
        reply
          .status(403)
          .send({
            error: "Forbidden",
            message: "You cannot access this resource",
          });
      }
    };
  });
});
