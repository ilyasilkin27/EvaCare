FROM oven/bun:latest

WORKDIR /app

# Copy manifest files first for efficient layer caching
COPY package.json package-lock.json bun.lockb* ./

# Install production dependencies
RUN bun install --production

# Copy source
COPY . .

ENV NODE_ENV=production

# Run the start script defined in package.json
CMD ["bun", "run", "start"]
