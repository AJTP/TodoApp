"use strict";

const { buildTestApp, truncateAll } = require("./setup");

const mockVerifyIdToken = jest.fn();

jest.mock("google-auth-library", () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

function mockGoogleProfile(overrides = {}) {
  mockVerifyIdToken.mockResolvedValueOnce({
    getPayload: () => ({
      sub: "google-123",
      email: "ada@example.com",
      email_verified: true,
      name: "Ada Lovelace",
      picture: "https://example.com/ada.jpg",
      ...overrides,
    }),
  });
}

describe("auth routes", () => {
  let app;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterEach(async () => {
    mockVerifyIdToken.mockReset();
    await truncateAll(app);
  });

  afterAll(async () => {
    await app.close();
  });

  test("POST /auth/google creates a new user on first login", async () => {
    mockGoogleProfile();

    const response = await app.inject({
      method: "POST",
      url: "/auth/google",
      payload: { id_token: "valid-token" },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
    expect(body.user).toMatchObject({ name: "Ada Lovelace", email: "ada@example.com" });
  });

  test("POST /auth/google logs in the same user on subsequent logins", async () => {
    mockGoogleProfile();
    const first = await app.inject({
      method: "POST",
      url: "/auth/google",
      payload: { id_token: "valid-token" },
    });

    mockGoogleProfile();
    const second = await app.inject({
      method: "POST",
      url: "/auth/google",
      payload: { id_token: "valid-token" },
    });

    expect(first.json().user.id).toBe(second.json().user.id);
  });

  test("POST /auth/google rejects an invalid Google token", async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error("invalid token"));

    const response = await app.inject({
      method: "POST",
      url: "/auth/google",
      payload: { id_token: "invalid-token" },
    });

    expect(response.statusCode).toBe(401);
  });

  test("POST /auth/google rejects an unverified email", async () => {
    mockGoogleProfile({ email_verified: false });

    const response = await app.inject({
      method: "POST",
      url: "/auth/google",
      payload: { id_token: "valid-token" },
    });

    expect(response.statusCode).toBe(401);
  });

  test("GET /auth/me without a token returns 401", async () => {
    const response = await app.inject({ method: "GET", url: "/auth/me" });

    expect(response.statusCode).toBe(401);
  });

  test("GET /auth/me with a valid token returns the current user profile", async () => {
    mockGoogleProfile();
    const loginResponse = await app.inject({
      method: "POST",
      url: "/auth/google",
      payload: { id_token: "valid-token" },
    });
    const { accessToken, user } = loginResponse.json();

    const response = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ id: user.id, email: user.email });
  });

  test("POST /auth/refresh issues a new token pair", async () => {
    mockGoogleProfile();
    const loginResponse = await app.inject({
      method: "POST",
      url: "/auth/google",
      payload: { id_token: "valid-token" },
    });
    const { refreshToken } = loginResponse.json();

    const response = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refresh_token: refreshToken },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
    expect(body.refreshToken).not.toBe(refreshToken);
  });

  test("POST /auth/refresh rejects an unknown refresh token", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refresh_token: "does-not-exist" },
    });

    expect(response.statusCode).toBe(401);
  });

  test("POST /auth/refresh rejects a reused (already rotated) refresh token", async () => {
    mockGoogleProfile();
    const loginResponse = await app.inject({
      method: "POST",
      url: "/auth/google",
      payload: { id_token: "valid-token" },
    });
    const { refreshToken } = loginResponse.json();

    await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refresh_token: refreshToken },
    });

    const response = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refresh_token: refreshToken },
    });

    expect(response.statusCode).toBe(401);
  });

  test("POST /auth/logout revokes every refresh token of the user", async () => {
    mockGoogleProfile();
    const loginResponse = await app.inject({
      method: "POST",
      url: "/auth/google",
      payload: { id_token: "valid-token" },
    });
    const { accessToken, refreshToken } = loginResponse.json();

    const logoutResponse = await app.inject({
      method: "POST",
      url: "/auth/logout",
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(logoutResponse.statusCode).toBe(204);

    const refreshResponse = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refresh_token: refreshToken },
    });
    expect(refreshResponse.statusCode).toBe(401);
  });

  test("POST /auth/logout without a token returns 401", async () => {
    const response = await app.inject({ method: "POST", url: "/auth/logout" });

    expect(response.statusCode).toBe(401);
  });
});
