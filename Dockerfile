# syntax=docker/dockerfile:1.7
# ============================================================
# SuperSender Pro - Hardened production image (monolith)
# ============================================================
FROM node:18-slim AS base

# Chromium + fonts for whatsapp-web.js / puppeteer, tini for PID 1 signal handling
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium \
      fonts-freefont-ttf \
      libxss1 \
      ca-certificates \
      wget \
      tini \
  && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production \
    PORT=3001

WORKDIR /app

# ---- Dependencies layer (cached unless lockfile changes) ----
FROM base AS deps
COPY package*.json ./
# Reproducible install from lockfile; fall back to install if lock drifts
RUN npm ci --omit=dev || npm install --omit=dev

# ---- Runtime image ----
FROM base AS runtime
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Writable runtime dirs, owned by the non-root node user
RUN mkdir -p uploads logs data .wa-auth public \
  && chown -R node:node /app

USER node

EXPOSE 3001

# Container-level health probe against the existing /api/health route
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/api/health || exit 1

# tini reaps zombie chromium processes and forwards signals cleanly
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server.js"]
