"use strict";

const errorResponseSchema = {
  $id: "errorResponse",
  type: "object",
  properties: {
    error: { type: "string" },
    message: { type: "string" },
    details: { type: "array" },
  },
};

module.exports = {
  errorResponseSchema,
};
