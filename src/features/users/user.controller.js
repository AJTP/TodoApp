"use strict";

const userService = require("./user.service");

async function getUser(request, reply) {
  const user = await userService.getUserById(request.server.pg, request.params.id);
  return reply.send(user);
}

module.exports = {
  getUser,
};
