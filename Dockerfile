# Stage 1: Build
FROM oven/bun:1.1.44-alpine AS builder

WORKDIR /app

# Copy package files and scripts
COPY package.json bun.lockb ./
COPY scripts ./scripts

# Install dependencies with cache mount
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --ignore-scripts && \
    bun run scripts/abort-if-not-bun.cjs || true

# Copy source code
COPY . .

# Build the application
RUN bun run build

# Stage 2: Production
FROM nginx:1.27-alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create non-root user
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
