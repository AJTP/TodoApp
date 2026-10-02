import type { FastifyInstance } from "fastify";

export default async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get("/health", async (request, reply) => {
    return reply.send({ status: "ok" });
  });
}
