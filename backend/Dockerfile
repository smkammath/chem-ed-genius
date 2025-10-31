# Backend Dockerfile for Render
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# Copy frontend automatically from repo
RUN mkdir -p /tmp/repo \
 && echo "⬇️ Cloning frontend..." \
 && curl -fsSL "https://github.com/smkammath/chem-ed-genius/archive/refs/heads/main.zip" -o /tmp/repo.zip \
 && unzip -q /tmp/repo.zip -d /tmp/repo \
 && FOLDER=$(ls /tmp/repo | head -n1) \
 && if [ -d "/tmp/repo/${FOLDER}/frontend" ]; then cp -r /tmp/repo/${FOLDER}/frontend /app/frontend; fi \
 && rm -rf /tmp/repo /tmp/repo.zip

EXPOSE 10000
CMD ["npm", "start"]
