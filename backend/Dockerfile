# ✅ FINAL Dockerfile for Chem-Ed Genius Backend
FROM node:20-alpine

# Install curl + unzip (missing in Alpine by default)
RUN apk add --no-cache curl unzip

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# ✅ Auto-clone frontend if not present
RUN mkdir -p /tmp/repo \
 && echo "⬇️ Downloading frontend repo from GitHub..." \
 && curl -fsSL "https://github.com/smkammath/chem-ed-genius/archive/refs/heads/main.zip" -o /tmp/repo.zip \
 && unzip -q /tmp/repo.zip -d /tmp/repo \
 && FOLDER=$(ls /tmp/repo | head -n1) \
 && if [ -d "/tmp/repo/${FOLDER}/frontend" ]; then \
      mkdir -p /app/frontend && cp -r /tmp/repo/${FOLDER}/frontend/* /app/frontend/; \
      echo "✅ Frontend copied to /app/frontend"; \
    else \
      echo "⚠️ Frontend folder not found inside repo archive"; \
    fi \
 && rm -rf /tmp/repo /tmp/repo.zip

EXPOSE 10000

CMD ["npm", "start"]
