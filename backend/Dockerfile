# ==============================
#  CHEM-ED GENIUS BACKEND DOCKERFILE
# ==============================

FROM node:20-alpine

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy all source files
COPY . .

# Expose Render port
EXPOSE 3000

# Start server
CMD ["npm", "start"]
