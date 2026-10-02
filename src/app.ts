import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import Fastify from "fastify";
import AutoLoad from "@fastify/autoload";
import config from "./config/index.js";
import authRoutes from "./features/auth/auth.routes.js";
import userRoutes from "./features/users/user.routes.js";
import healthRoutes from "./features/health/health.routes.js";
import type { FastifyServerOptions } from "fastify";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function build(opts: FastifyServerOptions = {}): Promise<ReturnType<typeof Fastify>> {
  const fastify = Fastify({
    logger: { level: config.logLevel },
    ...opts,
  });

  fastify.register(AutoLoad, {
    dir: join(__dirname, "plugins"),
  });

  // Load feature routes
  await fastify.register(authRoutes);
  await fastify.register(userRoutes);
  await fastify.register(healthRoutes);

  return fastify;
}
