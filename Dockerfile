# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# App and migrations (Flyway runs on startup via runFlywayOnStartup; needs db/migration)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/db ./db

# Required at runtime: FLYWAY_JDBC_URL (JDBC URL for Flyway), DATABASE_URL or MONGODB_URI, JWT_SECRET, etc. See .env.example.
EXPOSE 5000

CMD ["node", "dist/server.js"]
