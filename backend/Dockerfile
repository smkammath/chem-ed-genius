# ✅ Final Dockerfile for Chem-Ed Genius Backend
FROM node:20-alpine

# Install missing packages (curl + unzip)
RUN apk add --no-cache curl unzip

WORKDIR /app

# Copy package and install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy backend source
COPY . .

# ✅ Automatically pull frontend from your GitHub repo
ARG REPO=smkammath/chem-ed-genius
ARG BRANCH=main

RUN mkdir -p /tmp/repo \
 && echo "⬇️ Downloading frontend from GitHub..." \
 && curl -fsSL "https://github.com/${REPO}/archive/refs/heads/${BRANCH}.zip" -o /tmp/repo.zip \
 && unzip -q /tmp/repo.zip -d /tmp/repo \
 && FOLDER=$(ls /tmp/repo | head -n1) \
 && if [ -d "/tmp/repo/${FOLDER}/frontend" ]; then \
      rm -rf /app/frontend || true; \
      mkdir -p /app/frontend && cp -r /tmp/repo/${FOLDER}/frontend/* /app/frontend/; \
      echo "✅ Frontend copied successfully to /app/frontend"; \
    else \
      echo "⚠️ Frontend folder not found inside repo archive"; \
    fi \
 && rm -rf /tmp/repo /tmp/repo.zip

EXPOSE 10000
CMD ["npm", "start"]
