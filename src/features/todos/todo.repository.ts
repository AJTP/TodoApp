import { Queryable, Todo } from "../../shared/types.js";

interface TodoRow {
  id: string;
  user_id: string;
  title: string;
  description: string;
  completed: boolean;
  created_at: Date;
  updated_at: Date;
}

export async function findById(
  pg: Queryable,
  todoId: string,
  userId: string,
): Promise<Todo | null> {
  const { rows } = await pg.query("SELECT * FROM todos WHERE id = $1 AND user_id = $2", [
    todoId,
    userId,
  ]);

  const result = rows[0] as any;

  return result
    ? {
        id: result.id,
        title: result.title,
        description: result.description,
        userId: result.user_id,
        completed: result.completed,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
      }
    : null;
}

export async function getAll(pg: Queryable, userId: string): Promise<Array<Todo>> {
  const { rows } = await pg.query<TodoRow>("SELECT * FROM todos WHERE user_id = $1", [userId]);

  return rows.length
    ? rows.map((todo) => {
        return {
          id: todo.id,
          title: todo.title,
          description: todo.description,
          userId: todo.user_id,
          completed: todo.completed,
          createdAt: todo.created_at,
          updatedAt: todo.updated_at,
        };
      })
    : [];
}

export async function create(
  pg: Queryable,
  title: string,
  description: string,
  completed: boolean,
  userId: string,
): Promise<Todo | null> {
  const { rows } = await pg.query(
    "INSERT INTO todos (title, description, completed, user_id) VALUES ($1,$2,$3,$4) RETURNING *",
    [title, description, completed, userId],
  );

  const result = rows[0] as any;

  return result
    ? {
        id: result.id,
        title: result.title,
        description: result.description,
        userId: result.user_id,
        completed: result.completed,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
      }
    : null;
}

export async function update(
  pg: Queryable,
  title: string | undefined,
  description: string | undefined,
  completed: boolean | undefined,
  todoId: string,
  userId: string,
): Promise<Todo | null> {
  const todo = await findById(pg, todoId, userId);

  if (todo === null) return null;
  const result = await pg.query(
    "UPDATE todos SET title = $1,description = $2, completed = $3 WHERE id = $4 RETURNING *",
    [title ?? todo.title, description ?? todo.description, completed ?? todo.completed, todoId],
  );

  const row = result.rows[0] as any;

  return row
    ? {
        id: row.id,
        title: row.title,
        description: row.description,
        userId: row.user_id,
        completed: row.completed,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }
    : null;
}

export async function deleteById(pg: Queryable, todoId: string, userId: string): Promise<void> {
  await pg.query("DELETE FROM todos WHERE id = $1 AND user_id = $2", [todoId, userId]);
}
