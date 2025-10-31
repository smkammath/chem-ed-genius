# ======================================
# ✅ FINAL WORKING DOCKERFILE (Render OK)
# ======================================
FROM node:20-bullseye-slim

WORKDIR /app

# install minimal tools for downloading and unzipping
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl unzip ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# copy backend package files and install only production dependencies
COPY package*.json ./
RUN npm install --production

# copy backend source files
COPY . .

# --- Fetch frontend from GitHub and extract ---
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

# expose port and start
ENV PORT=10000
ENV NODE_ENV=production
EXPOSE ${PORT}

CMD ["node", "server.js"]
