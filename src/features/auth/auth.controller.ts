import type { FastifyRequest, FastifyReply } from "fastify";
import { verifyGoogleIdToken } from "../providers/google.js";
import * as identityService from "./identity.service.js";
import * as tokenService from "./token.service.js";
import * as userService from "../users/user.service.js";
import { UnverifiedEmailError } from "./exceptions.js";

interface GoogleLoginRequest extends FastifyRequest {
  body: { id_token: string };
}

interface RefreshRequest extends FastifyRequest {
  body: { refresh_token: string };
}

export async function googleLogin(
  request: GoogleLoginRequest,
  reply: FastifyReply,
): Promise<void> {
  const { id_token: idToken } = request.body;

  let profile;
  try {
    profile = await verifyGoogleIdToken(idToken);
  } catch (err) {
    request.log.warn({ err }, "Google id_token verification failed");
    reply.status(401).send({
      error: "Unauthorized",
      message: "Invalid Google token",
    });
    return;
  }

  let user;
  try {
    user = await identityService.findOrCreateUserFromIdentity(
      request.server.pg,
      profile,
    );
  } catch (err) {
    if (err instanceof UnverifiedEmailError) {
      reply.status(401).send({ error: "Unauthorized", message: err.message });
      return;
    }
    throw err;
  }

  const accessToken = await reply.jwtSign({
    id: user.id,
    email: user.email,
  });
  const refreshToken = await tokenService.issueRefreshToken(
    request.server.pg,
    user.id,
  );

  reply.status(200).send({ accessToken, refreshToken, user });
}

export async function refreshAccessToken(
  request: RefreshRequest,
  reply: FastifyReply,
): Promise<void> {
  const { refresh_token: refreshTokenValue } = request.body;

  const rotated = await tokenService.rotateRefreshToken(
    request.server.pg,
    refreshTokenValue,
  );

  if (!rotated) {
    reply.status(401).send({
      error: "Unauthorized",
      message: "Invalid or expired refresh token",
    });
    return;
  }

  const user = await userService.getUserById(
    request.server.pg,
    rotated.userId,
  );
  const accessToken = await reply.jwtSign({
    id: rotated.userId,
    email: user.email,
  });

  reply.status(200).send({ accessToken, refreshToken: rotated.refreshToken });
}

export async function logout(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  await tokenService.revokeAllRefreshTokens(request.server.pg, request.user.id);
  reply.status(204).send();
}

export async function getMe(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const user = await userService.getUserById(request.server.pg, request.user.id);
  reply.send(user);
}
