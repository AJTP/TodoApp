"use strict";

const fp = require("fastify-plugin");

module.exports = fp(async function errorHandlerPlugin(fastify) {
  fastify.setErrorHandler(function (error, request, reply) {
    const statusCode = error.statusCode || 500;

    request.log.error({ err: error }, "request error");

    if (error.validation) {
      reply.status(400).send({
        error: "Bad Request",
        message: error.message,
        details: error.validation,
      });
      return;
    }

    const isAppException = error.name && error.name !== "Error";

    reply.status(statusCode).send({
      error: statusCode === 500 ? "Internal Server Error" : error.name || "Error",
      message: statusCode === 500 ? "Something went wrong" : error.message,
      ...(isAppException && error.details && { details: error.details }),
    });
  });

  fastify.setNotFoundHandler(function (request, reply) {
    reply.status(404).send({
      error: "Not Found",
      message: `Route ${request.method} ${request.url} not found`,
    });
  });
});
