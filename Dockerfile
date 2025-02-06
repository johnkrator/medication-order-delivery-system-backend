FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files and npmrc
COPY package*.json .npmrc ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Remove .npmrc file to avoid token exposure
RUN rm -f .npmrc

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files and npmrc
COPY package*.json .npmrc ./

# Install production dependencies only
RUN npm ci --omit=dev \
    && rm -f .npmrc

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Expose the port the app runs on
EXPOSE 4000

# Start the application
CMD ["npm", "run", "start:prod"]
