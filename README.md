# 🎓 RedMonKey IT Academy LMS

Навчальна LMS-система для управління навчальним процесом в IT-академії.

> **Стек:** React 19 · Express 5 · MongoDB · ShadCN UI · Tailwind CSS · TypeScript

---

## 🚀 Швидкий старт

### Вимоги

- Node.js ≥ 20
- npm ≥ 10
- MongoDB (локально або Atlas)

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
# Відредагуй backend/.env — заповни MONGO_URL та JWT-секрети
```

**Frontend:**
```bash
cp frontend/.env.example frontend/.env
# Перевір VITE_API_URL (за замовчуванням http://localhost:3000/api/v1)
```

### 4. Заповнити базу тестовими даними (опціонально)

```bash
npm run seed -w backend
```

Сід створить тестових користувачів, групи та заняття для розробки.

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
├── backend/         # Express 5 + MongoDB API
├── frontend/        # React 19 + Vite + ShadCN
├── shared/          # Спільні типи та схеми (TypeScript)
└── package.json     # Root workspace
```

## 📜 Скрипти

| Команда | Що робить |
|---------|-----------|
| `npm run dev` | Запускає shared + backend + frontend |
| `npm run build` | Збирає всі workspace-и |
| `npm run seed -w backend` | Заповнює БД тестовими даними |
| `npm run lint -w frontend` | Запускає ESLint у frontend |

---

## 📚 Документація

| Файл | Опис |
|------|------|
| [IT_Academy_LMS_ТЗ.md](./IT_Academy_LMS_ТЗ.md) | Технічне завдання: API, схеми БД, ролі |
| [DESIGN.md](./DESIGN.md) | Дизайн-система: кольори, типографіка, компоненти |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Правила роботи з гілками, комітами, PR |

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
