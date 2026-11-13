FROM node:22-bookworm-slim AS source
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/floorplan/package.json packages/floorplan/
RUN npm ci --no-audit --no-fund
COPY . .

FROM source AS web-build
RUN npm run build -w @plan2walk/web

FROM source AS api-build
RUN npm run build -w @plan2walk/api
RUN npm prune --omit=dev --no-audit --no-fund

FROM nginx:1.28-alpine AS frontend
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=web-build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 8080

FROM node:22-bookworm-slim AS backend
ENV NODE_ENV=production PORT=8080
WORKDIR /app
COPY --from=api-build --chown=node:node /app/node_modules ./node_modules
COPY --from=api-build --chown=node:node /app/apps/api/dist ./apps/api/dist
USER node
EXPOSE 8080
CMD ["node", "apps/api/dist/main.cjs"]

FROM backend AS standalone
COPY --from=web-build --chown=node:node /app/apps/web/dist ./apps/web/dist
