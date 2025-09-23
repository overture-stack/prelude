FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the conductor CLI
RUN npm run build

# Make the CLI executable
RUN chmod +x dist/main.js

# Default command (can be overridden)
CMD ["node", "dist/main.js"]