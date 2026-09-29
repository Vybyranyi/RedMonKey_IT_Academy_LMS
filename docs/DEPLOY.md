# Деплой: Docker + Render Blueprint

Застосунок деплоїться **одним Docker-образом**: Express віддає і API (`/api/v1`), і зібраний React-фронтенд з того ж домену. База — керований Postgres на Render. Усе описано кодом:

| Файл | Що робить |
|---|---|
| [`Dockerfile`](../Dockerfile) | Двоетапна збірка: `build` (усі залежності, `npm run build`) → `runtime` (лише prod-залежності + `dist`). На старті — `prisma migrate deploy`, потім сервер |
| [`.dockerignore`](../.dockerignore) | Не пускає в образ `node_modules`, `dist`, `.env`, `.git` |
| [`docker-compose.yml`](../docker-compose.yml) | Локально: Postgres 16 + контейнер застосунку |
| [`render.yaml`](../render.yaml) | Blueprint: база + веб-сервіс + змінні оточення |
| [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | Job `docker` — перевіряє, що образ збирається |
| [`.github/workflows/cd.yml`](../.github/workflows/cd.yml) | Після зеленого CI на `main` смикає Deploy Hook Render |

## Локально в Docker

```bash
docker compose up --build        # http://localhost:3000
```

Порожня база без користувачів — залий демо-дані з хоста (**seed стирає базу**):

```bash
DATABASE_URL=postgresql://lms:lms@localhost:5433/lms DIRECT_URL=postgresql://lms:lms@localhost:5433/lms npm run seed -w backend
```

`docker compose down` зупиняє, `docker compose down -v` ще й стирає дані БД.

## Перший деплой на Render

1. Змерджити гілку з `render.yaml` у `main`.
2. Render Dashboard → **New → Blueprint** → обрати репозиторій → **Apply**. Render створить базу `redmonkey-lms-db` і сервіс `redmonkey-lms`, згенерує JWT-секрети й підставить `DATABASE_URL`.
3. Перший деплой запустити вручну (**Manual Deploy**) — `autoDeployTrigger: off`, далі деплоїть CD.
4. Сервіс → **Settings → Deploy Hook** → скопіювати URL. GitHub → **Settings → Secrets and variables → Actions**:
   - Secret `RENDER_DEPLOY_HOOK_URL` — URL хука;
   - Variable `RENDER_APP_URL` — `https://redmonkey-lms.onrender.com` (необов'язково, для перевірки після деплою).
5. Перший адмін: сервіс → **Environment** → задати `ADMIN_EMAIL` і `ADMIN_PASSWORD` (≥ 6 символів; необов'язково `ADMIN_FIRST_NAME`, `ADMIN_LAST_NAME`) → **Save, rebuild, and deploy**. На старті контейнер створить адміна (і академію, якщо база порожня), у логах — `[create-admin]: адміна створено`. Поки в базі є активний адмін, скрипт нічого не робить, тож змінні можна лишити; пароль зміни в профілі після першого входу. Без Render: `DATABASE_URL="<External URL>" DIRECT_URL="<External URL>" ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run create-admin -w backend`.
6. Демо-дані (замість кроку 5, якщо потрібні групи й студенти): база → **Connections → External Database URL**, і з ноутбука:

   ```bash
   DATABASE_URL="<External URL>" DIRECT_URL="<External URL>" npm run seed -w backend
   ```

   Seed стирає базу, тож це — лише перед першою демонстрацією.

## Обмеження free-плану

- Веб-сервіс засинає після 15 хв без запитів; перший запит після сну — близько хвилини.
- Free Postgres видаляється через 30 днів. Для довшого життя — платний план або Neon (тоді `DATABASE_URL` з `-pooler` і `DIRECT_URL` без нього, як у `backend/.env.example`, задаються в Dashboard замість `fromDatabase`).
- `preDeployCommand` на free недоступний, тому міграції запускає сам контейнер при старті (`CMD` у Dockerfile). `prisma migrate deploy` бере advisory lock, тож два контейнери не накотять міграцію двічі.
