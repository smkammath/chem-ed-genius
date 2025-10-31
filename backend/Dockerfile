# ==============================================================
# ✅ Chem-Ed Genius — Backend Dockerfile (Render Production Build)
# ==============================================================

# Use official Node.js 20 Alpine image (fast + secure)
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install essential tools (curl + unzip for repo fetch)
RUN apk add --no-cache curl unzip

# Copy package files first to leverage Docker caching
COPY package*.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Copy the backend source code
COPY . .

# Optional: auto-fetch frontend for reference (non-blocking)
RUN mkdir -p /tmp/repo \
 && echo "⬇️ Downloading frontend..." \
 && curl -fsSL "https://github.com/smkammath/chem-ed-genius/archive/refs/heads/main.zip" -o /tmp/repo.zip \
 && unzip -q /tmp/repo.zip -d /tmp/repo \
 && FOLDER=$(ls /tmp/repo | head -n1) \
 && if [ -d "/tmp/repo/${FOLDER}/frontend" ]; then \
      cp -r /tmp/repo/${FOLDER}/frontend /app/frontend; \
      echo "✅ Frontend copied for reference"; \
    else \
      echo "⚠️ No frontend folder found in repo archive"; \
    fi \
 && rm -rf /tmp/repo /tmp/repo.zip

# Expose backend port
EXPOSE 10000

# Run the backend
CMD ["npm", "start"]
