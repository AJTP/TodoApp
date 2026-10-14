import { Queryable, Todo } from "../../shared/types.js";
import { TodoNotFoundError } from "./exceptions.js";
import * as todoRepository from "./todo.repository.js";

export async function getTodoById(pg: Queryable, todoId: string, userId: string): Promise<Todo> {
  const todo = await todoRepository.findById(pg, todoId, userId);
  if (!todo) {
    throw new TodoNotFoundError(todoId);
  }

  return todo;
}

export async function createTodo(
  pg: Queryable,
  title: string,
  description: string | undefined,
  completed: boolean,
  userId: string,
): Promise<Todo> {
  const todo = await todoRepository.create(pg, title, description, completed, userId);
  if (!todo) {
    throw new Error();
  }
  return todo;
}

export async function getAllTodos(pg: Queryable, userId: string): Promise<Array<Todo>> {
  const todos = await todoRepository.getAll(pg, userId);
  if (todos && todos?.length <= 0) {
    return [];
  }
  return todos;
}

export async function updateTodo(
  pg: Queryable,
  title: string | undefined,
  description: string | undefined,
  completed: boolean | undefined,
  id: string,
  userId: string,
): Promise<Todo> {
  const todo = await todoRepository.update(pg, title, description, completed, id, userId);
  if (!todo) {
    throw new TodoNotFoundError(id);
  }
  return todo;
}

export async function deleteTodo(pg: Queryable, id: string, userId: string): Promise<void> {
  const todo = await todoRepository.findById(pg, id, userId);

  if (!todo) {
    throw new TodoNotFoundError(id);
  }
  await todoRepository.deleteById(pg, id, userId);
}
