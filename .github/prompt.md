Project context:
- Framework stack: NestJS backend with MongoDB database.
- Preferred package manager: yarn (avoid npm for installs/lockfiles).
- Communication note: respond to user in Vietnamese when they message in Vietnamese.
- All comment code: in English

Env and structure guidelines:
- Each service must include `env.dev.md` and `env.prod.md` templates in its own folder; update them whenever env vars change and copy to `.env.dev` or `.env.prod` before running.
- Shared variables live in root `env.dev.md` and `env.prod.md` (copy to root `.env.dev` and `.env.prod`).
- ConfigModule uses `envFilePath: `.env.${process.env.NODE_ENV}`` with `expandVariables: true` to load environment-specific files.
- Load order: root `.env.${NODE_ENV}` first, then service `.env.${NODE_ENV}` to allow overrides.
- Current TS path aliases: `libs/*` -> `src/libs/*`, `services/*` -> `src/services/*`; import using `from 'libs/...';` or `from 'services/...';`.
- Identity service runs via `npm run start:service-identity` (ts-node + tsconfig-paths); Swagger served at `/api`.
- Redis: prefer 3-master cluster via `REDIS_CLUSTER_NODES`; fallback single node with `REDIS_HOST/REDIS_PORT`.
- When adding a new service, mirror the Identity layout under `src/services/<service>` and create its `env.dev.md` and `env.prod.md` templates.