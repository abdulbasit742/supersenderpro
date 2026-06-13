FROM node:18-slim

RUN apt-get update && apt-get install -y \
  chromium \
  fonts-freefont-ttf \
  libxss1 \
  wget \
  ca-certificates \
  --no-install-recommends && \
  rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .
RUN mkdir -p uploads logs data .wa-auth public

EXPOSE 3001
CMD ["node", "server.js"]
