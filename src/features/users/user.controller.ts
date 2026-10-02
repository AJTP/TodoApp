import type { FastifyRequest, FastifyReply } from "fastify";
import * as userService from "./user.service.js";

interface GetUserRequest extends FastifyRequest {
  params: { id: string };
}

export async function getUser(
  request: GetUserRequest,
  reply: FastifyReply,
): Promise<void> {
  const user = await userService.getUserById(
    request.server.pg,
    request.params.id,
  );
  reply.send(user);
}
