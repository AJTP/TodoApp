import { ZodReply, ZodRequest } from "../../shared/fastify-types.js";
import {
  createTodoSchema,
  deleteTodoSchema,
  getAllTodosSchema,
  getTodoSchema,
  toTodoResponse,
  updateTodoSchema,
} from "./todo.schema.js";
import * as todoService from "./todo.service.js";

export async function getTodo(
  request: ZodRequest<typeof getTodoSchema>,
  reply: ZodReply<typeof getTodoSchema>,
): Promise<void> {
  const todo = await todoService.getTodoById(request.server.pg, request.params.id, request.user.id);
  reply.send(toTodoResponse(todo));
}

export async function createTodo(
  request: ZodRequest<typeof createTodoSchema>,
  reply: ZodReply<typeof createTodoSchema>,
): Promise<void> {
  const todo = await todoService.createTodo(
    request.server.pg,
    request.body.title,
    request.body.description,
    request.body.completed,
    request.user.id,
  );

  reply.send(toTodoResponse(todo));
}

export async function getAllTodos(
  request: ZodRequest<typeof getAllTodosSchema>,
  reply: ZodReply<typeof getAllTodosSchema>,
): Promise<void> {
  const todos = await todoService.getAllTodos(request.server.pg, request.user.id);
  reply.send(todos.map(toTodoResponse));
}

export async function updateTodo(
  request: ZodRequest<typeof updateTodoSchema>,
  reply: ZodReply<typeof updateTodoSchema>,
): Promise<void> {
  const todo = await todoService.updateTodo(
    request.server.pg,
    request.body.title,
    request.body.description,
    request.body.completed,
    request.params.id,
    request.user.id,
  );

  reply.send(toTodoResponse(todo));
}

export async function deleteTodo(
  request: ZodRequest<typeof deleteTodoSchema>,
  reply: ZodReply<typeof deleteTodoSchema>,
): Promise<void> {
  await todoService.deleteTodo(request.server.pg, request.params.id, request.user.id);

  reply.status(204);
}
