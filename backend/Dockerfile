FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --include=dev

COPY . .
RUN cp src/prisma/schema.prisma src/prisma/schema.docker.prisma \
  && sed -i 's/provider = "sqlite"/provider = "postgresql"/' src/prisma/schema.docker.prisma \
  && npx prisma generate --schema src/prisma/schema.docker.prisma \
  && mkdir -p auth uploads .baileys-auth

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "src/index.js"]
