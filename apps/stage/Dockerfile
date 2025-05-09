FROM node:lts-alpine

ARG ASSET_PREFIX
ENV ASSET_PREFIX=$ASSET_PREFIX

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

# First copy just the package files
COPY --chown=node:node package*.json ./

# Install dependencies with plain npm install first to ensure package-lock.json exists
RUN npm install

# Then copy the rest of the code
COPY --chown=node:node . .

# Set up volume
VOLUME [ "/usr/src/public/static/dms_user_assets" ]

# Clean and rebuild with ci
RUN npm cache clean --force
RUN npm ci
RUN NEXT_TELEMETRY_DISABLED=1 npm run build

EXPOSE 3000
CMD [ "npm", "start" ]