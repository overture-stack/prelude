# ======================================================================== #
# Stage 1 — builder                                                        #
# Installs all dependencies (including devDeps) and compiles the Next.js   #
# application. The build cache is removed before the runner copies output. #
# ======================================================================== #
FROM node:18-alpine AS builder

ARG ASSET_PREFIX
ENV ASSET_PREFIX=$ASSET_PREFIX
ENV NEXT_TELEMETRY_DISABLED=1

ENV APP_UID=9999
ENV APP_GID=9999

RUN apk --no-cache add shadow && \
    groupmod -g $APP_GID node && \
    usermod -u $APP_UID -g $APP_GID node && \
    mkdir -p /usr/src && \
    chown -R node:node /usr/src

USER node
WORKDIR /usr/src

# Install all dependencies (full install runs prepare → ts-patch install)
COPY --chown=node:node apps/stage/package*.json ./
RUN npm ci

# Copy source and replace the docs symlink with the real docs directory
COPY --chown=node:node apps/stage ./
RUN rm -f ./public/docs
COPY --chown=node:node docs ./public/docs

# Build the Next.js app, then remove webpack build cache (~350 MB)
# The cache is only useful for incremental rebuilds, not at runtime
RUN npm run build && rm -rf .next/cache

# ======================================================================== #
# Stage 2 — runner                                                         #
# Installs production dependencies only and copies the compiled output.    #
# devDependencies (TypeScript, ts-patch, jest, etc.) are never included.   #
# ======================================================================== #
FROM node:18-alpine AS runner

ENV NEXT_TELEMETRY_DISABLED=1
# Ensures next.config.js rewrites() route to internal Docker hostnames
ENV IS_DOCKER=true

ENV APP_UID=9999
ENV APP_GID=9999

RUN apk --no-cache add shadow && \
    groupmod -g $APP_GID node && \
    usermod -u $APP_UID -g $APP_GID node && \
    mkdir -p /usr/src && \
    chown -R node:node /usr/src

USER node
WORKDIR /usr/src

# Copy node_modules from builder.
# Re-running npm ci --omit=dev would miss transitive dependencies of devDeps
# that are traced as runtime requirements by Next.js's file tracer (e.g.
# fast-json-stable-stringify via extra-watch-webpack-plugin → schema-utils → ajv).
# Copying the full node_modules avoids hunting down each such missing package.
COPY --chown=node:node --from=builder /usr/src/package.json ./package.json
COPY --chown=node:node --from=builder /usr/src/node_modules ./node_modules

# Copy compiled output from builder
COPY --chown=node:node --from=builder /usr/src/.next ./.next
COPY --chown=node:node --from=builder /usr/src/public ./public
# next.config.js must be present: Next.js re-reads it on every server start
# to evaluate publicRuntimeConfig from the live environment variables
COPY --chown=node:node --from=builder /usr/src/next.config.js ./next.config.js
# pages/ directory must be present: discoverDataTables() scans it at runtime
# via fs.readdirSync to find dataTable* folders for navbar construction
COPY --chown=node:node --from=builder /usr/src/pages ./pages

VOLUME ["/usr/src/public/static/dms_user_assets"]

EXPOSE 3000
CMD ["npm", "start"]
