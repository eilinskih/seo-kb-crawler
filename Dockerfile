FROM node:26.3.1-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:26.3.1-alpine AS api

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist/apps/api ./dist/apps/api

EXPOSE 3000
CMD ["node", "dist/apps/api/main.js"]

FROM node:26.3.1-alpine AS crawler-worker

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist/apps/crawler-worker ./dist/apps/crawler-worker

CMD ["node", "dist/apps/crawler-worker/main.js"]
