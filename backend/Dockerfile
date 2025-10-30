# backend/Dockerfile - fetches frontend from GitHub during build
FROM node:20-bullseye-slim

WORKDIR /app

# install deps required for downloading/unzipping
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl unzip ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# copy backend package and install production deps
COPY package*.json ./
RUN npm install --production

# copy backend files (build context is backend/)
COPY . .

# --- Fetch frontend from GitHub and copy into /app/frontend ---
# Set repo and branch here (change only if your repo or branch differs)
ARG REPO=smkammath/chem-ed-genius
ARG BRANCH=main
ENV REPO_ZIP=https://github.com/${REPO}/archive/refs/heads/${BRANCH}.zip

# Download repo archive and extract only the frontend directory into /app/frontend
RUN mkdir -p /tmp/repo \
 && curl -fsSL "${REPO_ZIP}" -o /tmp/repo.zip \
 && unzip -q /tmp/repo.zip -d /tmp/repo \
 && # find extracted top-level folder (repo-branch)
    EXTRACTED_DIR=$(ls -1 /tmp/repo | head -n1) \
 && if [ -d "/tmp/repo/${EXTRACTED_DIR}/frontend" ]; then \
      mkdir -p /app/frontend && cp -r /tmp/repo/${EXTRACTED_DIR}/frontend/* /app/frontend/; \
    else \
      echo "WARNING: frontend directory not found in repo zip"; \
    fi \
 && rm -rf /tmp/repo /tmp/repo.zip

# expose port
ENV PORT=3000
EXPOSE ${PORT}

# run
CMD ["node", "server.js"]
