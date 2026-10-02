"use strict";

const authController = require("./auth.controller");
const { googleLoginSchema, meSchema, refreshSchema, logoutSchema } = require("./auth.schema");
const config = require("../../config");

const authRateLimit = {
  max: config.authRateLimitMax,
  timeWindow: config.authRateLimitWindow,
};

module.exports = async function authRoutes(fastify) {
  fastify.post(
    "/auth/google",
    {
      schema: googleLoginSchema,
      config: { rateLimit: authRateLimit },
    },
    authController.googleLogin,
  );

  fastify.post(
    "/auth/refresh",
    {
      schema: refreshSchema,
      config: { rateLimit: authRateLimit },
    },
    authController.refreshAccessToken,
  );

  fastify.get(
    "/auth/me",
    { schema: meSchema, preHandler: [fastify.authenticate] },
    authController.getMe,
  );

  fastify.post(
    "/auth/logout",
    { schema: logoutSchema, preHandler: [fastify.authenticate] },
    authController.logout,
  );
};
