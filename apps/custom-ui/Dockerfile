# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Build arguments for configuration
ARG VITE_ARRANGER_API=http://localhost:5050
ARG VITE_DOCUMENT_TYPE=file
ARG VITE_INDEX_NAME=demo_centric

# Set environment variables for build
ENV VITE_ARRANGER_API=$VITE_ARRANGER_API
ENV VITE_DOCUMENT_TYPE=$VITE_DOCUMENT_TYPE
ENV VITE_INDEX_NAME=$VITE_INDEX_NAME

# Copy package files
COPY package*.json ./
COPY patches ./patches

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Serve the application with nginx
FROM nginx:alpine

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration if needed
# COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
