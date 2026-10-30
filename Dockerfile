# Multi-stage production Dockerfile for Repo Analyzer API & Background Worker
FROM node:22-alpine AS builder

WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy root workspace configuration files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./

# Copy package manifests for all workspace packages
COPY packages/shared/package.json packages/shared/tsconfig.json ./packages/shared/
COPY packages/database/package.json packages/database/tsconfig.json ./packages/database/
COPY packages/analyzer/package.json packages/analyzer/tsconfig.json ./packages/analyzer/
COPY packages/ai/package.json packages/ai/tsconfig.json ./packages/ai/
COPY apps/api/package.json apps/api/tsconfig.json ./apps/api/

# Install dependencies with lockfile validation
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared ./packages/shared
COPY packages/database ./packages/database
COPY packages/analyzer ./packages/analyzer
COPY packages/ai ./packages/ai
COPY apps/api ./apps/api

# Build shared packages and API application
RUN pnpm --filter @repo-analyzer/shared build && \
    pnpm --filter @repo-analyzer/database build && \
    pnpm --filter @repo-analyzer/analyzer build && \
    pnpm --filter @repo-analyzer/ai build && \
    pnpm --filter @repo-analyzer/api build

# Production Runner Stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace configs and installed dependencies
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/packages/database ./packages/database
COPY --from=builder /app/packages/analyzer ./packages/analyzer
COPY --from=builder /app/packages/ai ./packages/ai
COPY --from=builder /app/apps/api ./apps/api

EXPOSE 4000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/v1/health || exit 1

CMD ["node", "apps/api/dist/server.js"]
