// Prisma config for Identity service
// In Prisma 7, datasource URL is configured here instead of schema.prisma
import { config } from "dotenv";
import { resolve } from "path";
import { defineConfig, env } from "prisma/config";

// Load environment file based on NODE_ENV (dev or prod)
// If NODE_ENV is not set, default to dev
const nodeEnv = process.env.NODE_ENV || "dev";
const envFile = resolve(__dirname, `../.env.${nodeEnv}`);

// Load env file (this will override process.env)
config({ path: envFile });

export default defineConfig({
  schema: "schema.prisma",
  migrations: {
    path: "migrations",
  },
  datasource: {
    url: env("DB_URI"),
  },
});

