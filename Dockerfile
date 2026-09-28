# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────
# RedMonKey IT Academy LMS — один образ: backend (Express) віддає
# і API (/api/v1), і зібраний frontend (React) з того ж домену.
#
#   docker build -t redmonkey-lms .
#   docker compose up --build        # разом з Postgres, див. docker-compose.yml
# ─────────────────────────────────────────────────────────────

# Та сама мажорна версія Node, що й у CI (.github/workflows/ci.yml)
ARG NODE_VERSION=22

# ═════════════ Етап 1: build — усі залежності, компіляція ═════════════
FROM node:${NODE_VERSION}-bookworm-slim AS build

# Prisma-двигуну потрібен OpenSSL, якого в slim-образі немає
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Спершу лише package.json-и: шар з `npm ci` перезбирається, тільки коли
# змінились залежності, а не при кожній правці коду
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci

COPY . .

# Frontend і API на одному домені — достатньо відносного шляху.
# VITE_* вшиваються в JS під час білду, змінити їх потім у контейнері не можна
ENV VITE_API_URL=/api/v1

# shared → backend (prisma generate + tsc) → frontend (tsc + vite build)
RUN npm run build

# ═════════════ Етап 2: runtime — лише те, що потрібно для запуску ═════════════
FROM node:${NODE_VERSION}-bookworm-slim AS runtime

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production

# Лише production-залежності backend і shared: без Vite, React, TypeScript, Vitest
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --omit=dev --workspace=backend --workspace=@redmonkey/shared \
  && npm cache clean --force

# Результати першого етапу
COPY --from=build /app/shared/dist shared/dist
COPY --from=build /app/backend/dist backend/dist
COPY --from=build /app/backend/prisma backend/prisma
COPY --from=build /app/frontend/dist frontend/dist

# Prisma Client генерується в node_modules — тут вони свої, тож генеруємо ще раз
RUN cd backend && npx prisma generate

ENV STATIC_DIR=/app/frontend/dist \
  PORT=3000 \
  PATH=/app/node_modules/.bin:$PATH

# Не root: вразливість у залежності не дасть root-доступу до контейнера
USER node
WORKDIR /app/backend
EXPOSE 3000

# Міграції з репозиторію → старт сервера. `exec` робить node процесом PID 1,
# щоб SIGTERM від Docker/Render дійшов до нього (див. src/index.ts)
CMD ["sh", "-c", "prisma migrate deploy && exec node dist/index.js"]
