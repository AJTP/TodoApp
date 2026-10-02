import fp from "fastify-plugin";
import { errorResponseSchema } from "../shared/schemas/common.schema.js";

export default fp(async function schemasPlugin(fastify) {
  fastify.addSchema(errorResponseSchema);
});
