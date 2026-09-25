# 🎓 RedMonKey IT Academy LMS

Навчальна LMS-система для управління навчальним процесом в IT-академії.

> **Стек:** React 19 · Express 5 · PostgreSQL (Prisma) · ShadCN UI · Tailwind CSS · TypeScript

---

## 🚀 Швидкий старт

### Вимоги

- Node.js ≥ 22 (jsdom у frontend-тестах не працює на Node 20)
- npm ≥ 10
- PostgreSQL (напр. безкоштовний проєкт на [Neon](https://neon.tech))

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
# Відредагуй backend/.env — заповни DATABASE_URL / DIRECT_URL (Neon) та JWT-секрети
```

**Frontend:**
```bash
cp frontend/.env.example frontend/.env
# Перевір VITE_API_URL (за замовчуванням http://localhost:3000/api/v1)
```

### 4. Застосувати міграції та заповнити базу тестовими даними

```bash
npm run prisma:deploy -w backend   # застосовує міграції з backend/prisma/migrations
npm run seed -w backend            # опціонально: тестові користувачі та групи
```

> Якщо твоя БД створена раніше через `db push`, `prisma:deploy` зупиниться з помилкою `P3005`. Одноразовий перехід на міграції описано в [backend/prisma/MIGRATIONS.md](./backend/prisma/MIGRATIONS.md#одноразово-перевести-наявну-бд-на-міграції).

### 5. Запустити проект

```bash
npm run dev
```

Запускає всі три частини одночасно:

| Сервіс | URL |
|--------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000/api/v1 |
| Shared (watch) | — |

---

## 📁 Структура монорепо

```
RedMonKey_IT_Academy_LMS/
├── backend/         # Express 5 + PostgreSQL (Prisma) API
├── frontend/        # React 19 + Vite + ShadCN
├── shared/          # Спільні типи та схеми (TypeScript)
└── package.json     # Root workspace
```

## 📜 Скрипти

| Команда | Що робить |
|---------|-----------|
| `npm run dev` | Запускає shared + backend + frontend |
| `npm run build` | Збирає всі workspace-и |
| `npm test` | Ганяє тести (Vitest) у всіх workspace-ах |
| `npm run seed -w backend` | Заповнює БД тестовими даними |
| `npm run prisma:migrate -w backend -- --name <назва>` | Створює міграцію після зміни `schema.prisma` |
| `npm run prisma:deploy -w backend` | Застосовує міграції з репозиторію |
| `npm run prisma:status -w backend` | Показує, чи відстає БД від міграцій |
| `npm run lint -w frontend` | Запускає ESLint у frontend |

---

## 📚 Документація

| Файл | Опис |
|------|------|
| [IT_Academy_LMS_ТЗ.md](./IT_Academy_LMS_ТЗ.md) | Технічне завдання: API, схеми БД, ролі |
| [DESIGN.md](./DESIGN.md) | Дизайн-система: кольори, типографіка, компоненти |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Правила роботи з гілками, комітами, PR |
| [backend/prisma/MIGRATIONS.md](./backend/prisma/MIGRATIONS.md) | Міграції БД: щоденна робота і перехід з `db push` |
| [backend/prisma/QUERY_PLANS.md](./backend/prisma/QUERY_PLANS.md) | `EXPLAIN` журналу оцінок і leaderboard, рішення щодо індексів |

---

## 👥 Ролі в системі

| Роль | Можливості |
|------|-----------|
| `admin` | Повний доступ: управління користувачами, групами, налаштування |
| `teacher` | Заняття, оцінки, RedCoins для своїх груп |
| `student` | Перегляд своїх оцінок, розкладу, балансу монет |

---

## 🤝 Contributing

Перед тим як починати — прочитай [CONTRIBUTING.md](./CONTRIBUTING.md).
