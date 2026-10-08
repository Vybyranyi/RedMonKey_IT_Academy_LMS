# Деплой: Docker + Render Blueprint

Застосунок деплоїться **одним Docker-образом** на Render: Express віддає і API (`/api/v1`), і зібраний React-фронтенд з того ж домену. База (Postgres) і сховище аватарок (Storage) — один проєкт **Supabase**. Auth свій, на JWT — Supabase Auth не використовується. Усе, що можна, описано кодом:

| Файл | Що робить |
|---|---|
| [`Dockerfile`](../Dockerfile) | Двоетапна збірка: `build` (усі залежності, `npm run build`) → `runtime` (лише prod-залежності + `dist`). На старті — `prisma migrate deploy`, потім сервер |
| [`.dockerignore`](../.dockerignore) | Не пускає в образ `node_modules`, `dist`, `.env`, `.git` |
| [`docker-compose.yml`](../docker-compose.yml) | Локально: Postgres 16 + контейнер застосунку |
| [`render.yaml`](../render.yaml) | Blueprint: веб-сервіс + перелік змінних оточення (значення Supabase вводяться в Dashboard) |
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

## Supabase: база й сховище аватарок

Робиться один раз, вручну в дашборді Supabase. Секрети з кроків 2 і 4 йдуть лише в Render Dashboard і свій `backend/.env`, не в git.

1. **Проєкт.** New project → name `redmonkey-lms`, region **Central EU (Frankfurt)** (там же Render), згенерувати пароль БД і зберегти в менеджері паролів.
   - ⚠️ **Вимкнути Data API** — при створенні (Security / Advanced options) або потім у Project Settings → Data API. Supabase автоматично відкриває таблиці схеми `public` через REST (`/rest/v1/...`), і з увімкненим Data API таблицю `users` разом з `password_hash` можна було б прочитати публічним anon-ключем. Друга лінія захисту — міграція `enable_rls`: RLS увімкнено на всіх таблицях без політик, тож ролі `anon`/`authenticated` нічого не бачать, а застосунок (власник таблиць) працює як раніше.
2. **Рядки підключення.** Кнопка **Connect** → ORMs → Prisma:
   - `DATABASE_URL` — *Transaction pooler*, порт **6543**, з `?pgbouncer=true`;
   - `DIRECT_URL` — *Session pooler*, порт **5432** (`aws-0-eu-central-1.pooler.supabase.com`).
   - Не *Direct connection* (`db.<ref>.supabase.co`): вона лише IPv6, а Render IPv6 не має — `prisma migrate deploy` на старті контейнера не підключився б.
3. **Storage → New bucket** `avatars`: **Public bucket — ON**, *Restrict file upload size* — **1 MB**, *Allowed MIME types* — `image/webp`. Політик не створювати: backend пише секретним ключем (він обходить політики), а читання з публічного бакета політик не потребує.
4. **Ключі.** Project Settings → API Keys → **Project URL** і **Secret key** (`sb_secret_...`, або legacy `service_role`) → `SUPABASE_URL` і `SUPABASE_SECRET_KEY`.
5. **Перша міграція й дані** — з ноутбука, один раз (**seed стирає базу**):

   ```bash
   DATABASE_URL="<Session pooler>" DIRECT_URL="<Session pooler>" npm run prisma:deploy -w backend
   DATABASE_URL="<Session pooler>" DIRECT_URL="<Session pooler>" SUPABASE_URL="..." SUPABASE_SECRET_KEY="..." npm run seed -w backend
   ```

   Seed з Supabase-змінними очищає й бакет `avatars` — інакше там лишились би файли стертих користувачів. Без демо-даних замість seed — перший адмін (крок 5 нижче).
6. **Перевірка після деплою:** Supabase → Advisors → Security без помилок про RLS чи exposed tables; `curl https://<ref>.supabase.co/rest/v1/users -H "apikey: <anon key>"` повертає помилку, а не дані.

Проєкт Supabase один на прод і розробку. Щоденна розробка — на локальному Postgres (`docker compose up db`, порт 5433); Supabase-змінні локально потрібні лише тому, хто працює над аватарками.

## Перший деплой на Render

1. Змерджити гілку з `render.yaml` у `main`.
2. Render Dashboard → **New → Blueprint** → обрати репозиторій → **Apply**. Render створить сервіс `redmonkey-lms`, згенерує JWT-секрети й попросить значення для `sync: false`-змінних: `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (див. розділ про Supabase вище), `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
3. Перший деплой запустити вручну (**Manual Deploy**) — `autoDeployTrigger: off`, далі деплоїть CD.
4. Сервіс → **Settings → Deploy Hook** → скопіювати URL. GitHub → **Settings → Secrets and variables → Actions**:
   - Secret `RENDER_DEPLOY_HOOK_URL` — URL хука;
   - Variable `RENDER_APP_URL` — `https://redmonkey-lms.onrender.com` (необов'язково, для перевірки після деплою).
5. Перший адмін: сервіс → **Environment** → задати `ADMIN_EMAIL` і `ADMIN_PASSWORD` (≥ 6 символів; необов'язково `ADMIN_FIRST_NAME`, `ADMIN_LAST_NAME`) → **Save, rebuild, and deploy**. На старті контейнер створить адміна (і академію, якщо база порожня), у логах — `[create-admin]: адміна створено`. Поки в базі є активний адмін, скрипт нічого не робить, тож змінні можна лишити; пароль зміни в профілі після першого входу. Без Render: `DATABASE_URL="<Session pooler>" DIRECT_URL="<Session pooler>" ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run create-admin -w backend`.
6. Демо-дані (замість кроку 5, якщо потрібні групи й студенти) — seed з ноутбука, як у кроці 5 розділу про Supabase. Seed стирає базу, тож це — лише перед першою демонстрацією.

## Обмеження free-плану

- Веб-сервіс засинає після 15 хв без запитів; перший запит після сну — близько хвилини.
- Безкоштовний проєкт Supabase **ставиться на паузу після 7 днів без активності** — тоді не працюють ні база, ні аватарки, поки хтось не натисне **Restore** у дашборді. Перед демонстрацією зайти в застосунок або перевірити статус проєкту.
- Supabase free: 500 МБ БД і 1 ГБ файлів. Аватарка після стиснення ~20 КБ — з запасом.
- Ресайз картинок «на льоту» в Supabase — лише на Pro-плані, тож аватарки стискає сам backend (`sharp`) перед завантаженням.
- `preDeployCommand` на free недоступний, тому міграції запускає сам контейнер при старті (`CMD` у Dockerfile). `prisma migrate deploy` бере advisory lock, тож два контейнери не накотять міграцію двічі.
