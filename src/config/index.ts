import dotenv from "dotenv";
import Ajv from "ajv";
import ajvFormats from "ajv-formats";

dotenv.config();

const ajv = new Ajv({ useDefaults: true, coerceTypes: true, allErrors: true });
ajvFormats(ajv);

interface EnvVars {
  NODE_ENV: "development" | "test" | "production";
  PORT: string;
  HOST: string;
  LOG_LEVEL: string;
  DATABASE_URL: string;
  GOOGLE_CLIENT_ID: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  CORS_ORIGIN: string;
  AUTH_RATE_LIMIT_MAX: string;
  AUTH_RATE_LIMIT_WINDOW: string;
  STRICT_SSL?: string;
}

const envSchema = {
  type: "object",
  required: ["DATABASE_URL", "GOOGLE_CLIENT_ID", "JWT_SECRET"],
  properties: {
    NODE_ENV: {
      type: "string",
      enum: ["development", "test", "production"],
      default: "development",
    },
    PORT: { type: "string", pattern: "^[0-9]+$", default: "3000" },
    HOST: { type: "string", default: "0.0.0.0" },
    LOG_LEVEL: { type: "string", default: "info" },
    DATABASE_URL: { type: "string", minLength: 1 },
    GOOGLE_CLIENT_ID: { type: "string", minLength: 1 },
    JWT_SECRET: { type: "string", minLength: 32 },
    JWT_EXPIRES_IN: { type: "string", default: "1h" },
    CORS_ORIGIN: { type: "string", default: "*" },
    AUTH_RATE_LIMIT_MAX: { type: "string", pattern: "^[0-9]+$", default: "10" },
    AUTH_RATE_LIMIT_WINDOW: { type: "string", default: "1 minute" },
    STRICT_SSL: { type: "string" },
  },
} as const;

const validate = ajv.compile(envSchema);

const env = { ...process.env } as Partial<EnvVars>;
const valid = validate(env);

if (!valid) {
  const message = ajv.errorsText(validate.errors, { separator: "\n" });
  throw new Error(`Invalid environment configuration:\n${message}`);
}

// En redes con proxy que intercepta TLS (p. ej. Netskope), STRICT_SSL=false
// también desactiva la verificación de certificados en las llamadas HTTPS
// salientes en runtime (no solo al instalar dependencias), necesaria para
// que google-auth-library pueda descargar los certificados de verificación
// de Google.
if (env.STRICT_SSL === "false") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

// CORS_ORIGIN admite "*" (cualquier origen), un origen único o varios
// separados por comas.
function parseCorsOrigin(
  value: string,
): boolean | string | string[] {
  if (value === "*") return true;
  if (value.includes(",")) return value.split(",").map((origin) => origin.trim());
  return value;
}

export interface Config {
  nodeEnv: "development" | "test" | "production";
  isProduction: boolean;
  isTest: boolean;
  port: number;
  host: string;
  logLevel: string;
  databaseUrl: string;
  googleClientId: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  corsOrigin: boolean | string | string[];
  authRateLimitMax: number;
  authRateLimitWindow: string;
}

const config: Config = {
  nodeEnv: env.NODE_ENV as "development" | "test" | "production",
  isProduction: env.NODE_ENV === "production",
  isTest: env.NODE_ENV === "test",
  port: Number(env.PORT),
  host: env.HOST,
  logLevel: env.LOG_LEVEL,
  databaseUrl: env.DATABASE_URL,
  googleClientId: env.GOOGLE_CLIENT_ID,
  jwtSecret: env.JWT_SECRET,
  jwtExpiresIn: env.JWT_EXPIRES_IN,
  corsOrigin: parseCorsOrigin(env.CORS_ORIGIN),
  authRateLimitMax: Number(env.AUTH_RATE_LIMIT_MAX),
  authRateLimitWindow: env.AUTH_RATE_LIMIT_WINDOW,
};

export default config;
