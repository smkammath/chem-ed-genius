# ===============================
# ✅ FINAL WORKING DOCKERFILE
# ===============================
FROM node:20

WORKDIR /app

# Copy package info first
COPY package*.json ./

# Install only production dependencies
RUN npm install --production

# Copy backend files
COPY . .

# 🧠 FIX: Also copy the frontend folder from the parent directory into the container
COPY ../frontend ./frontend

# Expose the app port
ENV PORT=3000
EXPOSE 3000

# Start the backend server
CMD ["node", "server.js"]
