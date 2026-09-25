# 🎓 RedMonKey IT Academy LMS

Навчальна LMS-система для управління навчальним процесом в IT-академії: облік студентів і груп, розклад занять із відвідуваністю, журнал оцінок і внутрішня валюта **RedCoins** для мотивації.

> **Стек:** React 19 · Express 5 · PostgreSQL (Prisma) · ShadCN UI · Tailwind CSS · TypeScript
> **Версія:** 1.0.0 — що змінилось, див. [CHANGELOG.md](./CHANGELOG.md)

![Журнал оцінок](./docs/screenshots/grades-journal.png)

---

## ✨ Можливості

- **Три ролі** — адмін, викладач, студент: меню залежить від ролі, а доступ до кожного запису перевіряє backend.
- **Групи, студенти, викладачі** — створення, редагування, деактивація (адмін).
- **Розклад** — календар на тиждень і місяць, заняття за типами, домашнє завдання з дедлайном, проведення заняття з відміткою явки.
- **Журнал оцінок** — таблиця «студенти × заняття» з редагуванням просто в клітинці (з клавіатури: `Enter` — зберегти й до наступного студента) та масове виставлення оцінок за заняття.
- **RedCoins** — нарахування й списання монет, рейтинг групи, історія транзакцій.
- **Дашборд** під кожну роль — статистика, найближчі заняття, рейтинг.
- **Мобільна версія** — нижня навігація замість Sidebar.

## 📸 Скріншоти

| Вхід | Дашборд адміністратора |
|---|---|
| ![Сторінка входу](./docs/screenshots/login.png) | ![Дашборд адміністратора](./docs/screenshots/dashboard-admin.png) |

| Розклад | Деталі заняття й відвідуваність |
|---|---|
| ![Розклад на місяць](./docs/screenshots/schedule.png) | ![Деталі заняття з відміткою явки](./docs/screenshots/lesson-details.png) |

| RedCoins: рейтинг та історія | Кабінет студента |
|---|---|
| ![Сторінка RedCoins](./docs/screenshots/coins.png) | ![Дашборд студента](./docs/screenshots/dashboard-student.png) |

**Мобільна версія:**

<p>
  <img src="./docs/screenshots/mobile-dashboard.png" alt="Дашборд студента на телефоні" width="260" />
  &nbsp;
  <img src="./docs/screenshots/mobile-grades.png" alt="Оцінки студента на телефоні" width="260" />
</p>

---

## 🚀 Швидкий старт

### Вимоги

- Node.js ≥ 22 (jsdom у frontend-тестах не працює на Node 20)
- npm ≥ 10
- PostgreSQL: безкоштовний проєкт на [Neon](https://neon.tech) або локальний Postgres

### 1. Клонувати репозиторій

```bash
git clone https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS.git
cd RedMonKey_IT_Academy_LMS
```

### 2. Встановити залежності

```bash
npm install
```

> Це встановить залежності для всіх workspace-ів: `backend`, `frontend`, `shared`.

### 3. Налаштувати змінні оточення

**Backend:**
```bash
cp backend/.env.example backend/.env
# Відредагуй backend/.env — заповни DATABASE_URL / DIRECT_URL та JWT-секрети
```

- **Neon:** `DATABASE_URL` — рядок із `-pooler` у host, `DIRECT_URL` — той самий без `-pooler` (приклад у `.env.example`).
- **Локальний Postgres:** обидві змінні однакові, напр. `postgresql://postgres:postgres@localhost:5432/lms`.
- **JWT-секрети:** два різні рядки від 32 символів, інакше backend не стартує. Згенерувати: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`.

**Frontend:**
```bash
cp frontend/.env.example frontend/.env
# Перевір VITE_API_URL (за замовчуванням http://localhost:3000/api/v1)
```

> Змінні, експортовані в оточенні терміналу, мають пріоритет над `.env`. Якщо в тебе вже є глобальний `DATABASE_URL`, backend і скрипти підуть у ту базу.

### 4. Підготувати базу даних

```bash
npm run prisma:generate -w backend   # Prisma Client зі схеми
npm run build -w @redmonkey/shared   # спільні типи й Zod-схеми — без них не запуститься seed і тести
npm run prisma:deploy -w backend     # застосовує міграції з backend/prisma/migrations
npm run seed -w backend              # опціонально: тестові користувачі, групи й заняття
```

> ⚠️ `seed` **спершу стирає всі дані** в базі з `DATABASE_URL` — не запускай його проти спільної чи продакшн-бази.

> Якщо твоя БД створена раніше через `db push`, `prisma:deploy` зупиниться з помилкою `P3005`. Одноразовий перехід на міграції описано в [backend/prisma/MIGRATIONS.md](./backend/prisma/MIGRATIONS.md#одноразово-перевести-наявну-бд-на-міграції).

**Тестові акаунти після `seed`** (пароль усіх — `Password123!`, змінюється через `SEED_PASSWORD` у `backend/.env`):

| Роль | Email |
|------|-------|
| Адмін | `admin@academy.com` |
| Викладач | `teacher1@academy.com`, `teacher2@academy.com` |
| Студент | `student1@academy.com` … `student5@academy.com` |

### 5. Запустити проект

```bash
npm run dev
```

Запускає всі три частини одночасно (`shared` у watch-режимі перезбирається сам):

| Сервіс | URL |
|--------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000/api/v1 |
| Перевірка живості API | http://localhost:3000/api/v1/health |

---

## 📁 Структура монорепо

```
RedMonKey_IT_Academy_LMS/
├── backend/         # Express 5 + PostgreSQL (Prisma) API
├── frontend/        # React 19 + Vite + ShadCN
├── shared/          # Спільні типи та Zod-схеми (TypeScript)
├── docs/            # Скріншоти для README
└── package.json     # Root workspace
```

## 📜 Скрипти

| Команда | Що робить |
|---------|-----------|
| `npm run dev` | Запускає shared + backend + frontend |
| `npm run build` | Збирає всі workspace-и |
| `npm test` | Ганяє тести (Vitest) у всіх workspace-ах |
| `npm run lint` | ESLint у shared, backend і frontend |
| `npm run format` | Форматує код Prettier'ом (`format:check` — лише перевіряє, як у CI) |
| `npm run seed -w backend` | Стирає БД і заповнює її тестовими даними |
| `npm run prisma:generate -w backend` | Генерує Prisma Client після зміни `schema.prisma` |
| `npm run prisma:migrate -w backend -- --name <назва>` | Створює міграцію після зміни `schema.prisma` |
| `npm run prisma:deploy -w backend` | Застосовує міграції з репозиторію |
| `npm run prisma:status -w backend` | Показує, чи відстає БД від міграцій |

---

## 📚 Документація

| Файл | Опис |
|------|------|
| [IT_Academy_LMS_ТЗ.md](./IT_Academy_LMS_ТЗ.md) | Технічне завдання: ролі, API, схема БД, roadmap |
| [DESIGN.md](./DESIGN.md) | Дизайн-система: кольори, типографіка, компоненти |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Правила роботи з гілками, комітами, PR, тестами |
| [CHANGELOG.md](./CHANGELOG.md) | Історія змін і підсумок шести тижнів розробки |
| [CLAUDE.md](./CLAUDE.md) | Архітектура й конвенції коротко — для AI-агентів і нових учасників |
| [backend/prisma/MIGRATIONS.md](./backend/prisma/MIGRATIONS.md) | Міграції БД: щоденна робота і перехід з `db push` |
| [backend/prisma/QUERY_PLANS.md](./backend/prisma/QUERY_PLANS.md) | `EXPLAIN` журналу оцінок і leaderboard, рішення щодо індексів |

---

## 👥 Ролі в системі

| Роль | Можливості |
|------|-----------|
| `admin` | Повний доступ: користувачі, групи, заняття, оцінки, RedCoins |
| `teacher` | Свої заняття, явка й оцінки на них, RedCoins для студентів своїх груп |
| `student` | Свій розклад, оцінки, відвідуваність, баланс монет і рейтинг групи |

Повна матриця прав — у [розділі 2 ТЗ](./IT_Academy_LMS_ТЗ.md#2-ролі-та-права-доступу).

---

## 🤝 Contributing

Перед тим як починати — прочитай [CONTRIBUTING.md](./CONTRIBUTING.md).
