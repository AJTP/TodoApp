import type { FastifyInstance } from "fastify";
import * as userController from "./user.controller.js";
import { getUserSchema } from "./user.schema.js";

export default async function userRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    "/users/:id",
    { schema: getUserSchema, preHandler: [fastify.authenticate] },
    userController.getUser,
  );
}
