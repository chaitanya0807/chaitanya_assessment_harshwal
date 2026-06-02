FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install native dependencies required for some Node packages (like python/make if needed)
# RUN apk add --no-cache python3 make g++ 

# Copy package.json and lockfile
COPY package*.json ./

# Install only production dependencies for a lighter image
RUN npm ci --only=production

# Copy built artifacts from a potential builder stage, or just copy source and build here
# To keep this simple and self-contained:
RUN npm install typescript -g
COPY . .
RUN npm run build

# Ensure the uploads directory exists
RUN mkdir -p /app/uploads

# Expose port
EXPOSE 3000

# Set Node environment
ENV NODE_ENV=production

# Start the application
CMD ["node", "dist/server.js"]
