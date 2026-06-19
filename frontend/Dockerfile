# syntax=docker/dockerfile:1.7
FROM node:18-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package*.json ./
RUN npm install --include=dev
COPY . .
RUN npm run build

FROM node:18-alpine AS runtime
RUN apk add --no-cache wget tini
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app ./
RUN chown -R node:node /app
USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000 || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["npm", "start"]
