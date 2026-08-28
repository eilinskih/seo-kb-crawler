FROM node:24.16.0-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:24.16.0-alpine AS api

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist/apps/api ./dist/apps/api

EXPOSE 3000
CMD ["node", "dist/apps/api/main.js"]

FROM node:24.16.0-alpine AS operator-console

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist/apps/operator-console ./dist/apps/operator-console

EXPOSE 4010
CMD ["node", "dist/apps/operator-console/main.js"]

FROM node:24.16.0-alpine AS crawler-worker

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist/apps/crawler-worker ./dist/apps/crawler-worker

CMD ["node", "dist/apps/crawler-worker/main.js"]

FROM node:24.16.0-alpine AS embedding-worker

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist/apps/embedding-worker ./dist/apps/embedding-worker

CMD ["node", "dist/apps/embedding-worker/main.js"]

FROM node:24.16.0-alpine AS fact-extraction-worker

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist/apps/fact-extraction-worker ./dist/apps/fact-extraction-worker

CMD ["node", "dist/apps/fact-extraction-worker/main.js"]

FROM node:24.16.0-alpine AS mcp-server

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist/apps/mcp-server ./dist/apps/mcp-server

CMD ["node", "dist/apps/mcp-server/main.js"]
