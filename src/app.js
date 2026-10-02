"use strict";

const path = require("node:path");
const Fastify = require("fastify");
const AutoLoad = require("@fastify/autoload");
const addFormats = require("ajv-formats");
const config = require("./config");

function build(opts = {}) {
  const fastify = Fastify({
    logger: { level: config.logLevel },
    ajv: {
      customOptions: { allErrors: true },
      plugins: [addFormats],
    },
    ...opts,
  });

  fastify.register(AutoLoad, {
    dir: path.join(__dirname, "plugins"),
  });

  // Load feature routes
  fastify.register(require("./features/auth/auth.routes"));
  fastify.register(require("./features/users/user.routes"));
  fastify.register(require("./features/health/health.routes"));

  return fastify;
}

module.exports = build;
