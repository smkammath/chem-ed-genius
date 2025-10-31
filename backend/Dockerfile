FROM node:20-bullseye-slim

WORKDIR /app

RUN apt-get update && apt-get install -y curl unzip && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# Pull frontend into /app/frontend if needed
ARG REPO=smkammath/chem-ed-genius
ARG BRANCH=main

RUN mkdir -p /tmp/repo \
 && echo "⬇️ Downloading frontend..." \
 && curl -fsSL "https://github.com/${REPO}/archive/refs/heads/${BRANCH}.zip" -o /tmp/repo.zip \
 && unzip -q /tmp/repo.zip -d /tmp/repo \
 && FOLDER=$(ls /tmp/repo | head -n1) \
 && if [ -d "/tmp/repo/${FOLDER}/frontend" ]; then cp -r /tmp/repo/${FOLDER}/frontend /app/frontend; fi \
 && rm -rf /tmp/repo /tmp/repo.zip

EXPOSE 10000
CMD ["npm", "start"]
