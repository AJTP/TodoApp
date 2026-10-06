import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  createTodoSchema,
  getTodoSchema,
  getAllTodosSchema,
  updateTodoSchema,
  deleteTodoSchema,
} from "./todo.schema.js";
import * as todoController from "./todo.controller.js";

export default async function todoRoutes(app: FastifyInstance): Promise<void> {
  const fastify = app.withTypeProvider<ZodTypeProvider>();

  fastify.get(
    "/todos/:id",
    { schema: getTodoSchema, preHandler: [fastify.authenticate] },
    todoController.getTodo,
  );

  fastify.post(
    "/todos",
    { schema: createTodoSchema, preHandler: [fastify.authenticate] },
    todoController.createTodo,
  );

  fastify.get(
    "/todos",
    { schema: getAllTodosSchema, preHandler: [fastify.authenticate] },
    todoController.getAllTodos,
  );

  fastify.patch(
    "/todos/:id",
    { schema: updateTodoSchema, preHandler: [fastify.authenticate] },
    todoController.updateTodo,
  );

  fastify.delete(
    "/todos/:id",
    { schema: deleteTodoSchema, preHandler: [fastify.authenticate] },
    todoController.deleteTodo,
  );
}
