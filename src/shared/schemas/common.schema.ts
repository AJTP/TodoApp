export const errorResponseSchema = {
  $id: "errorResponse",
  type: "object",
  properties: {
    error: { type: "string" },
    message: { type: "string" },
    details: {
      type: "array",
      items: {
        type: "object",
        properties: {
          instancePath: { type: "string" },
          schemaPath: { type: "string" },
          keyword: { type: "string" },
          params: { type: "object" },
          message: { type: "string" },
        },
      },
    },
  },
  required: ["error", "message"],
} as const;
