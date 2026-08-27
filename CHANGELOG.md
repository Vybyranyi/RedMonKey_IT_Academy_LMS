# Changelog — RedMonKey IT Academy LMS

Усі помітні зміни в проекті фіксуються тут.  
Формат базується на [Keep a Changelog](https://keepachangelog.com/), версії — на [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

Зміни, які ще не потрапили в офіційний реліз.

### Added
- Базова структура монорепо (backend / frontend / shared)
- Автентифікація: JWT access + refresh tokens
- Моделі БД: User, Group, Lesson, Grade, CoinTransaction, Attendance
- AppLayout: Sidebar з колапсом, Header із динамічним заголовком
- LoginPage з брендовим фоном і валідацією форми (Zod + Formik)
- GroupsPage: сітка карток груп, модалка створення (тільки admin)
- StudentsPage: таблиця студентів з можливістю пошуку, фільтрації, модалка створення (тільки admin)
- TeachersPage: сітка карток викладачів, модалка створення (тільки admin)
- `README.md`, `CONTRIBUTING.md`, `DESIGN.md`
- `.vscode/extensions.json` та `.vscode/settings.json`
- `CLAUDE.md` — контекст проєкту для AI-агентів (стек, архітектура backend/frontend, дизайн-система, конвенції)
- CI (`.github/workflows/ci.yml`): лінт frontend і білд усіх workspace-ів на кожен push/PR у `main`/`develop`
- `.github/ISSUE_TEMPLATE/config.yml` з посиланнями на ТЗ і CONTRIBUTING
- Self-service профіль на backend: `PATCH /auth/me` (власні `firstName`/`lastName`/`phone`/`avatar`) і `PATCH /auth/me/password`. Роль, група та email лишаються тільки під адміном через `PATCH /users/:id`
- ProfilePage (`/profile`) — перегляд і редагування власних даних та зміна пароля, доступно всім ролям
- Zod-схеми у `shared/src/schema/` — одні й ті самі правила валідації для backend і форм на frontend
- `parseBody()` (`backend/src/utils/validation.ts`) — згортає помилку Zod у `BadRequestError`, тож невалідний ввід повертає 400 з поясненням, а не 500 від Prisma
- `components/ui/skeleton.tsx` — ShadCN-примітив для loading-станів

### Changed
- **Міграція бази даних з MongoDB (Mongoose) на PostgreSQL (Prisma ORM), хостинг [Neon](https://neon.tech)**. Схема тепер реляційна: `id` — `uuid` замість `ObjectId`, масив `Group.teachers[]` замінено join-таблицею `GroupTeacher` (M:N), матеріали заняття винесено в окрему таблицю `LessonMaterial`. Кожна таблиця отримала `academy_id` — підготовка до майбутньої мульти-тенантності (зараз академія одна). Автентифікація лишилась власна на JWT — Supabase Auth не використовується
- Схема застосовується через `prisma db push` (міграційна історія `prisma/migrations/` ще не ініціалізована)
- Переміщено `.github/1-task.yml` та `2-bug.yml` у `.github/ISSUE_TEMPLATE/` — GitHub не розпізнавав issue forms поза цією директорією
- Оновлено `README.md`, `CONTRIBUTING.md`, `IT_Academy_LMS_ТЗ.md` — прибрано застарілі згадки MongoDB/Mongoose, узгоджено git-flow в ТЗ з реальною моделлю гілок (`main`/`develop` + `feature/`/`fix/`/`chore/`)
- `login`, `GET /auth/me` і `PATCH /auth/me` віддають однакову публічну проєкцію користувача (разом із `phone`) — раніше кожен ендпоінт збирав свій набір полів
- Зміна пароля відкликає refresh-токени на інших пристроях і одразу видає нову пару поточній сесії, тому користувача більше не викидає з системи після зміни власного пароля

### Fixed
- `PATCH /auth/me` повертав 500 замість 400 на невалідному вводі (`null`/число в імені, нерядковий пароль)
- Деактивований користувач із ще живим access-токеном міг змінити собі пароль і профіль — тепер `isActive` перевіряється так само, як у `login`/`refresh`/`getMe`
- Форма профілю надсилала всі поля на кожне збереження, через що редагування лише імені могло тихо затерти телефон
- Помилки з backend показувалися загальною фразою — тепер toast показує причину, яку віддав сервер

---

## Як вести цей файл

Після кожного тижня розробки додавай новий розділ:

```markdown
## [Тиждень N] — YYYY-MM-DD

### Added
- Новий функціонал

### Fixed  
- Виправлені баги

### Changed
- Зміни в існуючому коді (рефакторинг, оновлення залежностей)

### Removed
- Видалений функціонал
```

---

<!-- Підтримуй цей файл у актуальному стані — це допомагає команді бачити прогрес -->
