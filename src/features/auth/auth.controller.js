"use strict";

const { verifyGoogleIdToken } = require("../providers/google");
const identityService = require("./identity.service");
const tokenService = require("./token.service");
const userService = require("../users/user.service");
const { UnverifiedEmailError } = require("./exceptions");

async function googleLogin(request, reply) {
  const { id_token: idToken } = request.body;

  let profile;
  try {
    profile = await verifyGoogleIdToken(idToken);
  } catch (err) {
    request.log.warn({ err }, "Google id_token verification failed");
    return reply.status(401).send({ error: "Unauthorized", message: "Invalid Google token" });
  }

  let user;
  try {
    user = await identityService.findOrCreateUserFromIdentity(request.server.pg, profile);
  } catch (err) {
    if (err instanceof UnverifiedEmailError) {
      return reply.status(401).send({ error: "Unauthorized", message: err.message });
    }
    throw err;
  }

  const accessToken = await reply.jwtSign({ id: user.id, email: user.email });
  const refreshToken = await tokenService.issueRefreshToken(request.server.pg, user.id);

  return reply.status(200).send({ accessToken, refreshToken, user });
}

async function refreshAccessToken(request, reply) {
  const { refresh_token: refreshTokenValue } = request.body;

  const rotated = await tokenService.rotateRefreshToken(request.server.pg, refreshTokenValue);

  if (!rotated) {
    return reply
      .status(401)
      .send({ error: "Unauthorized", message: "Invalid or expired refresh token" });
  }

  const user = await userService.getUserById(request.server.pg, rotated.userId);
  const accessToken = await reply.jwtSign({ id: rotated.userId, email: user.email });

  return reply.status(200).send({ accessToken, refreshToken: rotated.refreshToken });
}

async function logout(request, reply) {
  await tokenService.revokeAllRefreshTokens(request.server.pg, request.user.id);
  return reply.status(204).send();
}

async function getMe(request, reply) {
  const user = await userService.getUserById(request.server.pg, request.user.id);
  return reply.send(user);
}

module.exports = {
  googleLogin,
  refreshAccessToken,
  logout,
  getMe,
};
