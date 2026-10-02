"use strict";

const userProperties = {
  id: { type: "string", format: "uuid" },
  name: { type: "string" },
  email: { type: "string", format: "email" },
  avatar_url: { type: ["string", "null"] },
  created_at: { type: "string", format: "date-time" },
};

const getUserSchema = {
  tags: ["users"],
  summary: "Obtiene un usuario por ID",
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string", format: "uuid" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: userProperties,
    },
    404: { $ref: "errorResponse#" },
  },
};

module.exports = {
  userProperties,
  getUserSchema,
};
