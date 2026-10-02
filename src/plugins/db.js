"use strict";

const fp = require("fastify-plugin");
const fastifyPostgres = require("@fastify/postgres");
const config = require("../config");

module.exports = fp(async function dbPlugin(fastify) {
  fastify.register(fastifyPostgres, {
    connectionString: config.databaseUrl,
  });
});
