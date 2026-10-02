"use strict";

const fp = require("fastify-plugin");
const { errorResponseSchema } = require("../shared/schemas/common.schema");

module.exports = fp(async function schemasPlugin(fastify) {
  fastify.addSchema(errorResponseSchema);
});
