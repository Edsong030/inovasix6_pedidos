# API Inovasix6 Pedidos
#
# Estágios:
#   build    – instala dependências, gera o Prisma Client e compila
#   migrate  – roda "prisma migrate deploy" (CLI do Prisma é dependência de desenvolvimento)
#   runtime  – só dependências de produção; sem .env, sem seed, usuário sem privilégio
#
# Node 24 em todos os estágios (derivam de "base"): o mesmo major usado no CI.
#
# Segredos (DATABASE_URL, JWT_SECRET...) chegam apenas por variáveis de ambiente em
# tempo de execução; nenhum arquivo .env entra na imagem (ver .dockerignore).

FROM node:24-alpine AS base
# O motor do Prisma precisa de OpenSSL no Alpine
RUN apk add --no-cache openssl
WORKDIR /app

FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

FROM build AS migrate
# Esta imagem contém o código do seed; com NODE_ENV=production ele se recusa a rodar
ENV NODE_ENV=production
USER node
CMD ["npx", "prisma", "migrate", "deploy"]

FROM build AS prod-deps
RUN npm prune --omit=dev

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=prod-deps /app/package.json /app/package-lock.json ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
RUN mkdir -p uploads && chown node:node uploads
USER node
EXPOSE 3001
CMD ["node", "dist/main"]
