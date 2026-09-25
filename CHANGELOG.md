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
- CI (`.github/workflows/ci.yml`): лінт frontend, білд і тести всіх workspace-ів на кожен push/PR у `main`/`develop`
- Тести на Vitest у всіх трьох workspace-ах (`npm test` з кореня): Zod-схеми в `shared`, утиліти, `access.policy` і сервіси в `backend`, утиліти, `authStore`, axios-interceptor і компоненти в `frontend`
- API-тести на Supertest (`backend/src/__tests__/api.test.ts`) — маршрути, авторизація і коди помилок без звернень до БД
- `backend/src/app.ts` — збірка Express-застосунку відокремлена від `listen()` у `src/index.ts`, щоб тести піднімали ті самі маршрути без зайняття порту
- `.github/ISSUE_TEMPLATE/config.yml` з посиланнями на ТЗ і CONTRIBUTING
- Self-service профіль на backend: `PATCH /auth/me` (власні `firstName`/`lastName`/`phone`/`avatar`) і `PATCH /auth/me/password`. Роль, група та email лишаються тільки під адміном через `PATCH /users/:id`
- ProfilePage (`/profile`) — перегляд і редагування власних даних та зміна пароля, доступно всім ролям
- Zod-схеми у `shared/src/schema/` — одні й ті самі правила валідації для backend і форм на frontend
- `parseBody()` (`backend/src/utils/validation.ts`) — згортає помилку Zod у `BadRequestError`, тож невалідний ввід повертає 400 з поясненням, а не 500 від Prisma
- `components/ui/skeleton.tsx` — ShadCN-примітив для loading-станів
- Безпека backend: `helmet`, `express-rate-limit` (загальний ліміт на `/api/v1`, суворіші на `/auth/login` і `/auth/refresh`), `express.json({ limit: '1mb' })`, змінна `TRUST_PROXY` для коректного IP за проксі
- Глобальні `notFoundHandler` і `errorHandler` (`backend/src/middlewares/error.middleware.ts`) — невідомий маршрут, битий JSON і завелике тіло віддають JSON 404/400/413 замість HTML-сторінки Express чи 500
- Міграції Prisma: `backend/prisma/migrations/0_init` (baseline, ідентичний схемі з `db push`), скрипти `prisma:migrate` / `prisma:deploy` / `prisma:status`, інструкція [`backend/prisma/MIGRATIONS.md`](./backend/prisma/MIGRATIONS.md)
- Звіт `EXPLAIN` для журналу оцінок і leaderboard — [`backend/prisma/QUERY_PLANS.md`](./backend/prisma/QUERY_PLANS.md)
- `repositories/__tests__/secret-fields.test.ts` — аудит: жоден метод репозиторію, крім потрібних auth, не вибирає `passwordHash`/`tokenVersion` і не тягне `User` без явного `select`

### Changed
- **Міграція бази даних з MongoDB (Mongoose) на PostgreSQL (Prisma ORM), хостинг [Neon](https://neon.tech)**. Схема тепер реляційна: `id` — `uuid` замість `ObjectId`, масив `Group.teachers[]` замінено join-таблицею `GroupTeacher` (M:N), матеріали заняття винесено в окрему таблицю `LessonMaterial`. Кожна таблиця отримала `academy_id` — підготовка до майбутньої мульти-тенантності (зараз академія одна). Автентифікація лишилась власна на JWT — Supabase Auth не використовується
- Схема застосовується міграціями (`prisma migrate`) замість `prisma db push`; скрипт `prisma:push` прибрано
- `GET /coins/transactions` віддає історію сторінками: `?limit=` (20 за замовчуванням, максимум 100), `?cursor=`, `?groupId=`, відповідь `{ items, nextCursor }`. Раніше адмін отримував увесь ledger академії одним запитом, а `CoinsPage` фільтрувала його за групою на клієнті
- `CoinsPage`: історія транзакцій підвантажується кнопкою «Показати ще»; після нарахування нова транзакція з'являється згори без повторного завантаження історії (перезапитується лише рейтинг)
- Журнал оцінок і зведення середніх фільтрують оцінки групи через `lessonId IN (...)` замість JOIN на `lessons`: 30 → 5.5 мс і 33 → 1.4 мс на 200k оцінок (Postgres перестав сканувати всю таблицю `grades`)
- Переміщено `.github/1-task.yml` та `2-bug.yml` у `.github/ISSUE_TEMPLATE/` — GitHub не розпізнавав issue forms поза цією директорією
- Оновлено `README.md`, `CONTRIBUTING.md`, `IT_Academy_LMS_ТЗ.md` — прибрано застарілі згадки MongoDB/Mongoose, узгоджено git-flow в ТЗ з реальною моделлю гілок (`main`/`develop` + `feature/`/`fix/`/`chore/`)
- `login`, `GET /auth/me` і `PATCH /auth/me` віддають однакову публічну проєкцію користувача (разом із `phone`) — раніше кожен ендпоінт збирав свій набір полів
- Зміна пароля відкликає refresh-токени на інших пристроях і одразу видає нову пару поточній сесії, тому користувача більше не викидає з системи після зміни власного пароля

### Fixed
- Mass assignment у `POST/PATCH /users` і `POST/PATCH /groups`: тіло запиту йшло в Prisma як є, тож через `PATCH /users/:id` можна було переписати `redCoins`, `tokenVersion`, `passwordHash`, `academyId`. Тепер тіло проходить Zod-схеми з білим списком полів (`shared/src/schema/user.schema.ts`, `group.schema.ts`), невалідний ввід дає 400 з поясненням
- Створення групи з UI завжди падало з 500: форма шле `''` і `YYYY-MM-DD` у датах, яких Prisma не приймає — схема приводить їх до `null`/`Date` і перевіряє, що дата завершення пізніша за дату початку
- Зайнятий email/назва групи, неіснуюча група чи викладач у тілі давали 500 — тепер 400
- `userRepository.findById` повертав увесь рядок `users` разом із `passwordHash`/`tokenVersion` — тепер явний `select` лише потрібних полів; секрети читають тільки методи `findCredentials*` для auth
- `POST /auth/login` без `email` шукав `where: { email: undefined }`, тобто звіряв пароль із першим-ліпшим користувачем, а обʼєкт замість рядка ставав Prisma-фільтром — тіло тепер валідує `loginCredentialsSchema`
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
