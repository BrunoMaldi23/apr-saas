# API NestJS del MVP APR SaaS.
# Construye dentro de la VM (ARM64 o amd64) para que Prisma genere el engine nativo correcto.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web-admin/package.json apps/web-admin/package.json
COPY apps/pwa-operador/package.json apps/pwa-operador/package.json
RUN npm ci --no-audit --no-fund

FROM deps AS build
# Prisma generate no necesita una DB real; solo un valor válido para el datasource.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public"
COPY . .
RUN npm run prisma:generate -w @apr/api \
 && npm run build -w @apr/api

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY apps/api/prisma ./apps/api/prisma
USER node
EXPOSE 3000
CMD ["node", "apps/api/dist/src/main.js"]
