# Use official Node.js image
FROM node:20

# Set working directory
WORKDIR /app

# Copy backend package files
COPY package*.json ./

# Install production dependencies
RUN npm install --production

# Copy backend files
COPY . .

# --- IMPORTANT FIX ---
# Copy frontend folder (one level up in repo) into the container
# Render sets the build context to /backend, so we must copy manually
COPY ../frontend ./frontend

# Expose the app port
ENV PORT=3000
EXPOSE 3000

# Start server
CMD ["node", "server.js"]
