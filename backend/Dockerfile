# syntax=docker/dockerfile:1.7
FROM node:18-alpine

RUN apk add --no-cache wget tini
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm install --include=dev

COPY . .
RUN cp src/prisma/schema.prisma src/prisma/schema.docker.prisma \
  && sed -i 's/provider = "sqlite"/provider = "postgresql"/' src/prisma/schema.docker.prisma \
  && npx prisma generate --schema src/prisma/schema.docker.prisma \
  && mkdir -p auth uploads .baileys-auth \
  && chown -R node:node /app

USER node
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/api/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/index.js"]
