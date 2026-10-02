import type { FastifyRequest, FastifyReply } from "fastify";
import * as userService from "./user.service.js";

export async function getUser(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const params = request.params as { id: string };
  const user = await userService.getUserById(request.server.pg, params.id);
  reply.send(user);
}
