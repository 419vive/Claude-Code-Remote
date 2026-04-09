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
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

# Only copy what's needed to run
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

# Install Playwright Chromium browser + OS dependencies for 8891 premium ad scraping
# Skip if EIGHTBALL_ACCOUNT is not set at build time (runs as optional postinstall)
RUN npx playwright install --with-deps chromium 2>/dev/null || true

EXPOSE 3000

# Run DB migrations then start server
CMD ["sh", "-c", "node dist/index.js"]
