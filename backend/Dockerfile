# backend/Dockerfile (Render-friendly)
FROM node:20-bullseye-slim

WORKDIR /app

# install minimal tools for downloading and unzipping
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl unzip ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# copy backend package files and install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# copy backend source files
COPY . .

# --- Fetch frontend from GitHub and extract (so backend serves static files) ---
ARG REPO=smkammath/chem-ed-genius
ARG BRANCH=main
ENV REPO_ZIP=https://github.com/${REPO}/archive/refs/heads/${BRANCH}.zip

RUN mkdir -p /tmp/repo \
 && echo "⬇️ Downloading frontend repo ${REPO_ZIP}" \
 && curl -fsSL "${REPO_ZIP}" -o /tmp/repo.zip \
 && unzip -q /tmp/repo.zip -d /tmp/repo \
 && FOLDER=$(ls /tmp/repo | head -n1) \
 && if [ -d "/tmp/repo/${FOLDER}/frontend" ]; then \
      rm -rf /app/frontend || true; \
      mkdir -p /app/frontend && cp -r /tmp/repo/${FOLDER}/frontend/* /app/frontend/; \
      echo "✅ Frontend copied successfully."; \
    else \
      echo "⚠️ Frontend directory not found in repo archive."; \
    fi \
 && rm -rf /tmp/repo /tmp/repo.zip

# expose port
ENV PORT=10000
EXPOSE ${PORT}

# start server
CMD ["node", "server.js"]
