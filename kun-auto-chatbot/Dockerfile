# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* pnpm-lock.yaml* ./
RUN npm install --legacy-peer-deps

# Copy source
COPY . .

# Build (Vite frontend + esbuild server bundle)
RUN npm run build

# ── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Only copy what's needed to run
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
# Startup migration script — auto-applies pending schema changes (idempotent)
COPY --from=builder /app/scripts ./scripts

EXPOSE 3000

# Run DB migrations FIRST (idempotent — safe to re-run on every container start),
# then start the server. If migrations fail, the script logs and exits 0 so the
# app still comes up — code has fallbacks for missing columns.
CMD ["sh", "-c", "node scripts/run-migrations.mjs && node dist/index.js"]
