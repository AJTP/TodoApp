import { build } from "./app.js";
import config from "./config/index.js";

const fastify = await build();

fastify.listen({ port: config.port, host: config.host }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});
