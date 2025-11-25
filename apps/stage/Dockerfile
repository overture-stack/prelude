FROM --platform=$BUILDPLATFORM node:lts-alpine

ARG ASSET_PREFIX
ENV ASSET_PREFIX=$ASSET_PREFIX

ARG NEXT_PUBLIC_DISABLE_WELCOME_BANNER
ENV NEXT_PUBLIC_DISABLE_WELCOME_BANNER=$NEXT_PUBLIC_DISABLE_WELCOME_BANNER

ENV APP_UID=9999
ENV APP_GID=9999

# Install dependencies and modify user/group
RUN apk --no-cache add shadow
RUN groupmod -g $APP_GID node
RUN usermod -u $APP_UID -g $APP_GID node

# Create and set permissions for /usr/src
RUN mkdir -p /usr/src
RUN chown -R node:node /usr/src

# Switch to node user
USER node
WORKDIR /usr/src

# Copy package files from stage app
COPY --chown=node:node apps/stage/package*.json ./

# Install dependencies
RUN npm ci

# Copy the stage app code
COPY --chown=node:node apps/stage ./

# Copy root docs folder to public/docs (overrides symlink)
COPY --chown=node:node docs ./public/docs

# Set up volume
VOLUME [ "/usr/src/public/static/dms_user_assets" ]

# Build the app
RUN NEXT_TELEMETRY_DISABLED=1 npm run build

EXPOSE 3000
CMD [ "npm", "start" ]