"use strict";

const build = require("./app");
const config = require("./config");

const fastify = build();

fastify.listen({ port: config.port, host: config.host }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});
