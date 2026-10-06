import { z } from "zod";
import type { Todo } from "../../shared/types.js";
import { errorResponseSchema } from "../../shared/schemas/common.schema.js";

export const TodoSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  title: z.string().min(1).max(120),
  description: z.string().optional(),
  completed: z.boolean(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});

export type TodoResponse = z.infer<typeof TodoSchema>;

export function toTodoResponse(todo: Todo): TodoResponse {
  return {
    id: todo.id,
    user_id: todo.userId,
    title: todo.title,
    completed: todo.completed,
    description: todo.description,
    created_at: todo.createdAt.toISOString(),
    updated_at: todo.updatedAt.toISOString(),
  };
}

// GET ALL

export const TodoListResponseSchema = z.array(TodoSchema);
export type TodoListResponse = z.infer<typeof TodoListResponseSchema>;

export const getAllTodosSchema = {
  tags: ["todos"],
  summary: "Obtiene todas las tareas del usuario",
  security: [{ bearerAuth: [] }],
  response: {
    200: TodoListResponseSchema,
    404: errorResponseSchema,
  },
};

// GET BY ID

export const getTodoSchema = {
  tags: ["todos"],
  summary: "Obtiene una tarea por ID",
  security: [{ bearerAuth: [] }],
  params: z.object({ id: z.uuid() }),
  response: {
    200: TodoSchema,
    404: errorResponseSchema,
  },
};

// POST

export const CreateTodoBody = TodoSchema.omit({
  id: true,
  user_id: true,
  created_at: true,
  updated_at: true,
}).extend({ completed: z.boolean().default(false) });

export const createTodoSchema = {
  tags: ["todos"],
  summary: "Crea una tarea",
  security: [{ bearerAuth: [] }],
  body: CreateTodoBody,
  response: {
    200: TodoSchema,
    404: errorResponseSchema,
  },
};

// PATCH

export const UpdateTodoBody = TodoSchema.omit({
  id: true,
  user_id: true,
  created_at: true,
  updated_at: true,
}).extend({
  title: z.string().optional(),
  description: z.string().optional(),
  completed: z.boolean().optional(),
});

export const updateTodoSchema = {
  tags: ["todos"],
  summary: "Actualiza una tarea",
  security: [{ bearerAuth: [] }],
  params: z.object({ id: z.uuid() }),
  body: UpdateTodoBody,
  response: {
    200: TodoSchema,
    404: errorResponseSchema,
  },
};

// DELETE
export const deleteTodoSchema = {
  tags: ["todos"],
  summary: "Eliminar una tarea",
  security: [{ bearerAuth: [] }],
  params: z.object({ id: z.uuid() }),
  response: {
    204: z.void(),
    404: errorResponseSchema,
  },
};
