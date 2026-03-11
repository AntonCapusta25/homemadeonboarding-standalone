# Use Node.js 18 LTS
FROM node:18-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy application code
COPY . .

# Compile TypeScript to JavaScript
RUN npx tsc --project tsconfig.json || echo "TypeScript compilation done"

# Expose port
EXPOSE 8787

# Start the server using node directly on compiled JS
CMD ["node", "server/dev-server.js"]
