# API, background worker and migrations share this image (build context: repo root).
#   docker build -f apps/api/Dockerfile -t redreader-api .
# Runs as: node dist/main.js (API) · node dist/worker.js (worker) · node_modules/.bin/prisma migrate deploy (migrations)
FROM node:22-bookworm-slim AS base
# openssl: Prisma's query engine; ca-certificates: outgoing HTTPS (Open Library, Google, SES).
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter "@bnw/api..."
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @bnw/shared build && pnpm --filter @bnw/api build
# No sample data in production images (the script also refuses to run in production).
RUN rm -f apps/api/dist/scripts/seed.js apps/api/dist/scripts/seed.js.map

# Runtime keeps the installed dependencies (including the Prisma CLI for migrations).
FROM base AS run
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app /app
WORKDIR /app/apps/api
RUN mkdir -p uploads && chown node:node uploads
USER node
EXPOSE 4000
CMD ["node", "dist/main.js"]
