# ======================================
# ✅ FINAL WORKING DOCKERFILE (Render OK)
# ======================================
FROM node:20-bullseye-slim

WORKDIR /app

# Install minimal tools for downloading and unzipping frontend
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl unzip ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Copy backend package files first for dependency caching
COPY package*.json ./

# Install production dependencies
RUN npm install --production

# Copy backend source files (includes server.js, embeddings.js, etc.)
COPY . .

# --- Fetch frontend from GitHub and extract into /app/frontend ---
ARG REPO=smkammath/chem-ed-genius
ARG BRANCH=main
ENV REPO_ZIP=https://github.com/${REPO}/archive/refs/heads/${BRANCH}.zip

RUN mkdir -p /tmp/repo \
 && echo "⬇️ Downloading frontend from ${REPO_ZIP}" \
 && curl -fsSL "${REPO_ZIP}" -o /tmp/repo.zip \
 && unzip -q /tmp/repo.zip -d /tmp/repo \
 && echo "📂 Extracting frontend directory..." \
 && FOLDER=$(ls /tmp/repo | head -n1) \
 && if [ -d "/tmp/repo/${FOLDER}/frontend" ]; then \
      mkdir -p /app/frontend && cp -r /tmp/repo/${FOLDER}/frontend/* /app/frontend/; \
      echo "✅ Frontend copied successfully."; \
    else \
      echo "⚠️ Frontend directory not found in repo archive."; \
    fi \
 && rm -rf /tmp/repo /tmp/repo.zip

# --- Expose correct Render port and start server ---
ENV PORT=10000
EXPOSE ${PORT}

CMD ["node", "server.js"]
