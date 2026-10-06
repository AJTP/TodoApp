import { describe, it, expect, beforeAll, afterEach, afterAll, vi, expectTypeOf } from "vitest";
import { buildTestApp } from "./setup";
import type { FastifyInstance } from "fastify";
import type { Todo } from "../src/shared/types";

const mockVerifyIdToken = vi.hoisted(() => vi.fn());

vi.mock("../src/features/providers/google.js", () => ({
  verifyGoogleIdToken: mockVerifyIdToken,
}));

function mockGoogleProfile(overrides: Record<string, unknown> = {}): void {
  mockVerifyIdToken.mockResolvedValueOnce({
    provider: "google",
    providerUserId: "google-123",
    email: "test@example.com",
    emailVerified: true,
    name: "Test User",
    avatarUrl: "https://example.com/test.jpg",
    ...overrides,
  });
}

async function getAuthToken(app: FastifyInstance): Promise<string> {
  mockGoogleProfile();
  const response = await app.inject({
    method: "POST",
    url: "/auth/google",
    payload: { id_token: "valid-token" },
  });
  const body = response.json() as any;
  return body.accessToken;
}

describe("Todo CRUD", () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    app = await buildTestApp();
    authToken = await getAuthToken(app);
    console.log("Auth Token:", authToken);
  });

  afterEach(async () => {
    mockVerifyIdToken.mockReset();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /todos retorna lista vacía cuando no hay tareas", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/todos",
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toBeInstanceOf(Array);
    body.forEach((item: Todo) => {
      //expect(item.user_id).toBe(1);
      expect(item.id).toBeDefined();
      expect(item.title).toBeDefined();
      expect(item.completed).toBeDefined();
    });
  });

  it.only("POST /todos crea una nueva tarea con título y descripción", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/todos",
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        title: "Mi primera tarea",
        description: "Descripción detallada",
      },
    });

    console.log(response);
    expect(response.statusCode).toBe(200);
    const body = response.json();

    expectTypeOf(body).toExtend<Todo>();
    expect(body.id).toBeDefined();
    expect(body.title).toBe("Mi primera tarea");
    expect(body.description).toBe("Descripción detallada");
    expect(body.completed).toBe(false);
    expect(body.created_at).toBeDefined();
    expect(body.updated_at).toBeDefined();
  });

  it("POST /todos crea tarea solo con título (descripción opcional)", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/todos",
      headers: { authorization: `Bearer ${authToken}` },
      payload: { title: "Tarea sin descripción" },
    });

    expectTypeOf(body).toExtend<Todo>();
    expect(body.id).toBeDefined();
    expect(body.title).toBeDefined();
    expect(body.completed).toBe(false);
  });

  it("GET /todos retorna todas las tareas del usuario", async () => {
    // Crear 2 tareas
    await app.inject({
      method: "POST",
      url: "/todos",
      headers: { authorization: `Bearer ${authToken}` },
      payload: { title: "Tarea 1" },
    });

    await app.inject({
      method: "POST",
      url: "/todos",
      headers: { authorization: `Bearer ${authToken}` },
      payload: { title: "Tarea 2" },
    });

    const response = await app.inject({
      method: "GET",
      url: "/todos",
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as Todo[];
    expect(body.length).toBe(2);
  });

  it("GET /todos/:id retorna una tarea por ID", async () => {
    const createResponse = await app.inject({
      method: "POST",
      url: "/todos",
      headers: { authorization: `Bearer ${authToken}` },
      payload: { title: "Tarea específica" },
    });

    const createdTodo = createResponse.json() as Todo;

    const response = await app.inject({
      method: "GET",
      url: `/todos/${createdTodo.id}`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as Todo;
    expect(body.id).toBe(createdTodo.id);
    expect(body.title).toBe("Tarea específica");
  });

  it("GET /todos/:id retorna 404 si tarea no existe", async () => {
    const fakeId = "550e8400-e29b-41d4-a716-446655440000";

    const response = await app.inject({
      method: "GET",
      url: `/todos/${fakeId}`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(response.statusCode).toBe(404);
  });

  it("PATCH /todos/:id actualiza título, descripción y completed", async () => {
    const createResponse = await app.inject({
      method: "POST",
      url: "/todos",
      headers: { authorization: `Bearer ${authToken}` },
      payload: { title: "Original", description: "Desc original" },
    });

    const createdTodo = createResponse.json() as Todo;

    const patchResponse = await app.inject({
      method: "PATCH",
      url: `/todos/${createdTodo.id}`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        title: "Actualizado",
        description: "Nueva descripción",
        completed: true,
      },
    });

    expect(patchResponse.statusCode).toBe(200);
    const patchBody = patchResponse.json() as Todo;
    expect(patchBody.title).toBe("Actualizado");
    expect(patchBody.description).toBe("Nueva descripción");
    expect(patchBody.completed).toBe(true);
  });

  it("PATCH /todos/:id actualiza solo el campo completado", async () => {
    const createResponse = await app.inject({
      method: "POST",
      url: "/todos",
      headers: { authorization: `Bearer ${authToken}` },
      payload: { title: "Tarea" },
    });

    const createdTodo = createResponse.json() as Todo;

    const patchResponse = await app.inject({
      method: "PATCH",
      url: `/todos/${createdTodo.id}`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: { completed: true },
    });

    expect(patchResponse.statusCode).toBe(200);
    const patchBody = patchResponse.json() as Todo;
    expect(patchBody.completed).toBe(true);
    expect(patchBody.title).toBe("Tarea"); // Sin cambios
  });

  it("PATCH /todos/:id retorna 404 si tarea no existe", async () => {
    const fakeId = "550e8400-e29b-41d4-a716-446655440000";

    const response = await app.inject({
      method: "PATCH",
      url: `/todos/${fakeId}`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: { completed: true },
    });

    expect(response.statusCode).toBe(404);
  });

  it("DELETE /todos/:id elimina una tarea y retorna 204", async () => {
    const createResponse = await app.inject({
      method: "POST",
      url: "/todos",
      headers: { authorization: `Bearer ${authToken}` },
      payload: { title: "Tarea a eliminar" },
    });

    const createdTodo = createResponse.json() as Todo;

    const deleteResponse = await app.inject({
      method: "DELETE",
      url: `/todos/${createdTodo.id}`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(deleteResponse.statusCode).toBe(204);

    // Verificar que se eliminó
    const getResponse = await app.inject({
      method: "GET",
      url: `/todos/${createdTodo.id}`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(getResponse.statusCode).toBe(404);
  });

  it("DELETE /todos/:id retorna 404 si tarea no existe", async () => {
    const fakeId = "550e8400-e29b-41d4-a716-446655440000";

    const response = await app.inject({
      method: "DELETE",
      url: `/todos/${fakeId}`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(response.statusCode).toBe(404);
  });

  it("GET /todos retorna 401 sin token de autenticación", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/todos",
    });

    expect(response.statusCode).toBe(401);
  });

  it("POST /todos retorna 401 sin token de autenticación", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/todos",
      payload: { title: "Test" },
    });

    expect(response.statusCode).toBe(401);
  });
});
