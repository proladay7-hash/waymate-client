# syntax=docker/dockerfile:1
# ------------------------------------------------------------------------------
# Build Stage - Expo Web export
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install build tools
RUN apk add --no-cache python3 make g++

# Copy package descriptors and patches
COPY package*.json ./
COPY scripts/ scripts/

# Install dependencies
RUN npm install --no-audit --no-fund

# Copy application source files
COPY . .

# Build arguments for API endpoints
ARG EXPO_PUBLIC_API_URL=http://localhost:8781
ARG EXPO_PUBLIC_AI_AGENT_URL=http://localhost:8000
ARG EXPO_PUBLIC_GOOGLE_CLIENT_ID=140599259641-0ee0simidi1gma7gt8geovdh235omijm.apps.googleusercontent.com
ARG EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=140599259641-0ee0simidi1gma7gt8geovdh235omijm.apps.googleusercontent.com

ENV EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL} \
    EXPO_PUBLIC_AI_AGENT_URL=${EXPO_PUBLIC_AI_AGENT_URL} \
    EXPO_PUBLIC_GOOGLE_CLIENT_ID=${EXPO_PUBLIC_GOOGLE_CLIENT_ID} \
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=${EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID} \
    NODE_ENV=production

# Export static web bundle
RUN npx expo export -p web

# ------------------------------------------------------------------------------
# Production Stage - Nginx Web Server
# ------------------------------------------------------------------------------
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose Waymate Client port
EXPOSE 8782

# Health check
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8782/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
