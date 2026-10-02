"use strict";

const userController = require("./user.controller");
const { getUserSchema } = require("./user.schema");

module.exports = async function userRoutes(fastify) {
  fastify.get(
    "/users/:id",
    { schema: getUserSchema, preHandler: [fastify.authenticate] },
    userController.getUser,
  );
};
