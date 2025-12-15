FROM node:22-slim

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

# Install curl for health checks
# RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Default command (can be overridden)
CMD ["node", "dist/main.js"]
