FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY e2e/package.json e2e/package.json
COPY tsconfig.base.json ./

RUN npm ci --ignore-scripts

COPY apps/api apps/api

RUN npx prisma generate --schema apps/api/prisma/schema.prisma
RUN npm run build --workspace=@gearflow/api

FROM build AS migrate

CMD ["npx", "prisma", "migrate", "deploy", "--schema", "apps/api/prisma/schema.prisma"]

FROM build AS seed

CMD ["npx", "tsx", "apps/api/src/seed.ts"]

FROM build AS runtime-deps

RUN npm prune --omit=dev

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY --from=runtime-deps /app/node_modules ./node_modules
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist

EXPOSE 3000

CMD ["node", "apps/api/dist/server.js"]

