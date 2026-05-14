FROM node:20-alpine

WORKDIR /app

# Install dependencies first (cached layer)
COPY package.json ./
RUN npm install --omit=dev

# Copy source
COPY . .

# Session and database directories
RUN mkdir -p session database

# Expose webhook server port
EXPOSE 4000

CMD ["node", "index.js"]
