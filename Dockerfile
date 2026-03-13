# syntax=docker/dockerfile:1.7

FROM oven/bun:1.3.1 AS dependencies
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM dependencies AS build
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
COPY drizzle ./drizzle
RUN bun run build

FROM dependencies AS production-dependencies
RUN rm -rf node_modules && bun install --frozen-lockfile --production

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/drizzle ./drizzle
COPY package.json ./

RUN groupadd --system app \
  && useradd --system --gid app --create-home --home-dir /home/app app \
  && chown -R app:app /app

USER app

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD ["node", "dist/scripts/preflight.js"]

CMD ["node", "dist/app.js"]
