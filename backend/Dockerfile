# ✅ FINAL Render-Compatible Dockerfile
FROM node:20-bullseye-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl unzip ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --production

COPY . .

ARG REPO=smkammath/chem-ed-genius
ARG BRANCH=main
ENV ZIP_URL=https://github.com/${REPO}/archive/refs/heads/${BRANCH}.zip

RUN mkdir -p /tmp/repo \
 && echo "📦 Downloading ${ZIP_URL}" \
 && curl -fsSL "${ZIP_URL}" -o /tmp/repo.zip \
 && unzip -q /tmp/repo.zip -d /tmp/repo \
 && FOLDER=$(ls /tmp/repo | head -n1) \
 && if [ -d "/tmp/repo/${FOLDER}/frontend" ]; then \
      mkdir -p /app/frontend && cp -r /tmp/repo/${FOLDER}/frontend/* /app/frontend/; \
      echo "✅ Frontend copied successfully."; \
    else \
      echo "⚠️ Frontend not found."; \
    fi \
 && rm -rf /tmp/repo /tmp/repo.zip

ENV PORT=10000
EXPOSE 10000
CMD ["node", "backend/server.js"]
