FROM node:20-alpine

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ curl

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose the main port
EXPOSE 8787

# Health check endpoint
HEALTHCHECK --interval=10s --timeout=5s --retries=3 --start-period=10s \
  CMD curl -f http://localhost:8787/health || exit 1

# Start the application
CMD ["npm", "start"]

