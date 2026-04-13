# ======================================================================== #
# Stage 1 — builder                                                        #
# Installs all dependencies (including devDeps) and compiles TypeScript.   #
# ======================================================================== #
FROM node:22-alpine AS builder

# Patch Alpine OS packages and upgrade npm to fix bundled CVEs
# (brace-expansion, minimatch, tar, glob, diff are npm-internal and only
#  execute during npm ci — not at application runtime)
RUN apk upgrade --no-cache

WORKDIR /app

# Install all deps first (layer cache: only re-runs when package files change)
COPY apps/conductor/package*.json ./
RUN npm ci

# Compile TypeScript → dist/
COPY apps/conductor/ .
RUN npm run build

# ======================================================================== #
# Stage 2 — runner                                                         #
# Production dependencies only; ships the compiled dist/ output.           #
# devDependencies (TypeScript, ts-node, vitest, @types/*) are excluded.    #
# ======================================================================== #
FROM node:22-alpine AS runner

# Same patches applied to the runtime stage
RUN apk upgrade --no-cache

WORKDIR /app

COPY apps/conductor/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

RUN chmod +x dist/main.js

CMD ["node", "dist/main.js"]
