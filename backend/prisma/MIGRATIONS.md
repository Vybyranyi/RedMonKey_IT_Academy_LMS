# Міграції бази даних

Схема БД змінюється **лише через міграції** в `backend/prisma/migrations/`. `prisma db push` більше не використовуємо: він змінює БД, не залишаючи історії, і на проді так не можна.

- `0_init` — baseline: рівно та схема, яку раніше створював `db push`. Перевірено на двох чистих БД (в одній схема з `migrate deploy`, в іншій з `db push`): `prisma migrate diff` між ними видає `No difference detected`.
- `migration_lock.toml` — фіксує провайдера (`postgresql`), не редагувати.

Усі команди нижче запускаються з кореня репозиторію й читають `backend/.env`.

## Щоденна робота

| Ситуація | Команда |
|---|---|
| Змінив `schema.prisma` | `npm run prisma:migrate -w backend -- --name add_homework_files` |
| Підтягнув чужі міграції з git | `npm run prisma:deploy -w backend` |
| Перевірити, чи БД відстає від репозиторію | `npm run prisma:status -w backend` |
| Нова порожня БД | `npm run prisma:deploy -w backend`, потім `npm run seed -w backend` |

`prisma:migrate` (`prisma migrate dev`) робить три речі: генерує SQL-файл нової міграції, застосовує його до твоєї БД і перегенеровує Prisma Client. **Коміть теку міграції разом зі зміною `schema.prisma` в одному PR.** Рев'юер має бачити SQL, який піде на прод.

Правила:
- Не редагуй міграцію, яка вже потрапила в `develop`/`main`: її застосовано на чужих БД, тож потрібна нова міграція, яка виправляє попередню.
- Не запускай `prisma db push` на спільній БД: він створить дрейф між БД і історією міграцій.
- На проді — тільки `prisma migrate deploy` (не інтерактивний, нічого не скидає). `migrate dev` може запропонувати скинути БД, тому він лише для розробки.

`migrate dev` створює тимчасову shadow-БД, щоб перевірити дрейф, тож нові міграції генеруй **проти локального Postgres** (`docker compose up db`, порт 5433), де Prisma може створювати й видаляти бази. На Supabase (спільна БД, вона ж прод) — лише `migrate deploy`. Пулер (`DATABASE_URL`) застосунок використовує лише для запитів, для міграцій Prisma бере `DIRECT_URL` — на Supabase це Session pooler (порт 5432), не IPv6-only Direct connection.

- `…_enable_rls` — RLS на всіх таблицях без жодної політики. Застосунок підключається як власник таблиць і RLS не підпорядковується; закриті лише ролі `anon`/`authenticated` Supabase Data API. Нова таблиця — додай `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` у її міграцію, інакше Supabase Advisors позначить її як відкриту.

## Одноразово: перевести наявну БД на міграції

Якщо БД створено раніше через `db push` (спільна Neon-БД команди), у ній уже є всі таблиці, але немає запису про `0_init`. Тоді `prisma:deploy` відмовиться працювати з помилкою `P3005: The database schema is not empty`, і це правильно: він не накатуватиме `CREATE TABLE` поверх наявних таблиць.

Порядок (робить **одна людина один раз** на кожну таку БД):

```bash
cd backend

# 1. Переконатися, що БД збігається зі схемою в репозиторії.
#    Очікуваний результат: "No difference detected."
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma

# 2. Позначити baseline як уже застосований. Дані й таблиці не змінюються,
#    лише додається рядок у службову таблицю _prisma_migrations.
npx prisma migrate resolve --applied 0_init

# 3. Перевірити: "Database schema is up to date!"
npm run prisma:status
```

Якщо на кроці 1 є різниця, хтось змінював БД в обхід репозиторію. Спершу з'ясуйте, чия зміна правильна, і приведіть схему та БД до одного стану. Лише після цього робіть `resolve`.

Весь сценарій (`P3005` → `resolve` → `status` → `migrate dev` без дрейфу) перевірено на локальній копії БД, створеній через `db push`.
