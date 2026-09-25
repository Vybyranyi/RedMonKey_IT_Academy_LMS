# Changelog — RedMonKey IT Academy LMS

Усі помітні зміни в проекті фіксуються тут.  
Формат базується на [Keep a Changelog](https://keepachangelog.com/), версії — на [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

Зміни, які ще не потрапили в реліз.

### Added
- `GET /users?withStats=true` — середній бал і відсоток відвідуваності кожного студента двома `GROUP BY` на весь список (`stats: { averageGrade, attendanceRate }`). Викладач отримує їх лише для студентів своїх груп, як і в `GET /users/:id/stats`; для решти `stats: null` (`accessPolicy.filterViewableUsers`)

### Fixed
- Токени ShadCN `--primary` і `--ring` — брендові `#C10000` / `#BA0000` замість майже чорного й сірого за замовчуванням: червоні іконки на плашках `StatCard`, `GroupCard` і `ErrorState`, фокус-кільця кнопок. Кнопки «Нова група», «Зберегти» у формі групи, «Позначити проведеним» і «Перейти до розкладу» (дашборд студента) були темними — тепер брендові, як решта CTA; чекбокси викладачів у формі групи — `accent-primary`. DESIGN.md і CLAUDE.md описують новий стан замість попередження «`bg-primary` — не бренд», скріншоти дашбордів у README перезнято
- `StudentsPage`: колонки «Середній бал» і «Відвідуваність» (і картка студента) показували `0` у червоній плашці й `0%` для всіх — backend цих полів не віддавав. Тепер там реальні дані, а студент без оцінок чи явки має «—», а не нуль
- Картка студента на `StudentsPage` завжди писала «Оцінки ще не виставлені» й «Історія транзакцій порожня» — списки читали поля, яких API не віддає. Тепер вона сама завантажує останні оцінки (`GET /grades?studentId=`) і транзакції (`GET /coins/transactions?studentId=&limit=5`), зі скелетоном, порожнім станом і повтором при збої. Студента чужої групи викладачу не запитує: ці ендпоінти не дають 403, а звужують вибірку, і порожня історія була б неправдою

---

## [1.0.0] — 2026-09-25

Перший реліз: усі функціональні вимоги ТЗ (тижні 1–5) і полірування тижня 6 — безпека backend і база даних (6.1, крім деплою), стійкість UI (6.2), якість коду і CI (6.3), документація (6.4). Не ввійшли й лишаються в роботі: деплой і чеклист продакшн-змінних (6.1), демо-дані та сценарій презентації (6.5), дрібниці з 6.6.

### Підсумок шести тижнів

| Етап roadmap | Період | Що зроблено | PR |
|---|---|---|---|
| Тиждень 1 — основа | 24.05 – 09.06 | ТЗ і шаблони задач; монорепо на npm workspaces з пакетом `shared`; Express + TypeScript, React + Vite + Tailwind + ShadCN; JWT-автентифікація (access + refresh), `authenticate`/`authorize`; CRUD груп; `ProtectedRoute`, `LoginPage`, `AppLayout` (Sidebar + Header), axios-interceptor для токенів | [#3](https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS/pull/3), [#14](https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS/pull/14), [#15](https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS/pull/15), [#16](https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS/pull/16), [#17](https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS/pull/17), [#18](https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS/pull/18), [#27](https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS/pull/27), [#28](https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS/pull/28), [#29](https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS/pull/29) |
| Тиждень 2 — користувачі | 10.06 – 27.08 | Users API з фільтрами, seed-скрипт; `GroupsPage`, `StudentsPage`, `TeachersPage` з формами й модалками деталей; README, CONTRIBUTING, DESIGN.md; **перехід з MongoDB на PostgreSQL (Neon) + Prisma**, CI, CLAUDE.md; self-service профіль (`PATCH /auth/me`, зміна пароля) і `ProfilePage`; лінт frontend до нуля помилок | [#30](https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS/pull/30), [#31](https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS/pull/31), [#32](https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS/pull/32), [#33](https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS/pull/33), [#42](https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS/pull/42), [#43](https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS/pull/43), [#45](https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS/pull/45) |
| Тиждень 3 — розклад | 28.08 – 03.09 | Lessons API з фільтрами за датою, групою й викладачем; Attendance API з масовою явкою; `SchedulePage` з календарем (тиждень/місяць), `LessonForm`, деталі заняття з відвідуваністю; `DashboardPage` за ролями | [#46](https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS/pull/46), [#47](https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS/pull/47), [#48](https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS/pull/48), [#50](https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS/pull/50), [#51](https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS/pull/51) |
| Тиждень 4 — журнал | 08.09 – 10.09 | Спільні типи й Zod-схеми оцінок; Grades API з `POST /grades/bulk` і середніми; правила доступу до оцінок; `GradeJournal` з inline-редагуванням у `GradeCell`, `BulkGradeForm`, `StudentGrades` | [#56](https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS/pull/56), [#57](https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS/pull/57), [#58](https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS/pull/58), [#59](https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS/pull/59), [#60](https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS/pull/60), [#66](https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS/pull/66), [#67](https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS/pull/67), [#68](https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS/pull/68), [#69](https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS/pull/69), [#70](https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS/pull/70) |
| Тиждень 5 — RedCoins і дашборд | 15.09 – 22.09 | Ledger `CoinTransaction` з балансом в одній транзакції, API й leaderboard; статистика користувача; `CoinsPage` (нарахування, баланс, історія, рейтинг), toast при нарахуванні; статистика й рейтинг на дашборді | [#76](https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS/pull/76), [#77](https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS/pull/77), [#78](https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS/pull/78), [#79](https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS/pull/79), [#80](https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS/pull/80), [#88](https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS/pull/88), [#89](https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS/pull/89), [#90](https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS/pull/90), [#91](https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS/pull/91), [#92](https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS/pull/92), [#93](https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS/pull/93) |
| Тиждень 6 — полірування | 25.09 | Тести на Vitest у всіх workspace (540 тестів) і Node 22 у CI; helmet, rate-limit, глобальний обробник помилок, аудит секретних полів, білий список полів тіла, міграції Prisma, `EXPLAIN` журналу й leaderboard, keyset-пагінація монет (6.1); 404/403, ErrorBoundary, Bottom Nav, скелетони й порожні стани, кеш і скасування запитів, оптимістичні оновлення (6.2); Prettier, ESLint у backend, тести транзакцій, код-рев'ю з виправленнями (6.3); документація й скріншоти (6.4) | [#95](https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS/pull/95), [#96](https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS/pull/96), [#97](https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS/pull/97), [#98](https://github.com/Vybyranyi/RedMonKey_IT_Academy_LMS/pull/98) |

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
- Стійкість UI (ТЗ 6.2): `NotFoundPage` і catch-all маршрут (невідомий URL — 404 всередині layout замість порожнього екрана), стан 403 (`ForbiddenPage`) замість мовчазного редіректу на головну, два `ErrorBoundary` — навколо всього роутера (разом з `AppLayout`) і навколо сторінки в `AppLayout` (Sidebar лишається робочим, перехід на інший розділ знімає помилку)
- Мобільна навігація: `BottomNav` (Головна / Розклад / Оцінки / Монети + меню «Ще» з рештою розділів, профілем і виходом), Sidebar ховається нижче `md` і стартує згорнутим на планшеті
- `components/common/` — `EmptyState`, `ErrorState` (з кнопкою «Спробувати знову»), `ErrorBoundary`; `AppSkeleton` замість тексту «Завантаження...» під час відновлення сесії
- Скелетони, порожні стани з CTA і помилка завантаження з повтором на сторінках груп, студентів, викладачів, журналу, RedCoins, розкладу й дашборду
- `api/cache.ts` — кеш із дедуплікацією для `GET /groups` (60 с; скидається після змін груп і користувачів, а також на логін/логаут): дашборд → журнал → монети роблять один запит замість трьох
- `AbortController` у завантаженнях сторінок: перемикання групи, гортання тижнів і пошук студентів скасовують запити, що вже не потрібні
- `toastApiError` (`utils/apiError.ts`) — єдиний показ помилок запитів: мовчить про скасовані запити й завершену сесію, однакові помилки паралельних запитів дають один toast
- Оптимістичні оновлення (`lib/optimistic.ts`): оцінка в `GradeCell` і видалення з'являються одразу з відкатом при помилці; нарахування RedCoins одразу додає транзакцію й змінює баланс у рейтингу (`lib/leaderboard.ts`), відкочуючи саме цю операцію; рядки журналу й відвідуваності під `React.memo` — зміна однієї клітинки не перемальовує таблицю
- Prettier на весь монорепо (ТЗ 6.3): `.prettierrc.json`, `npm run format` / `format:check`, `.gitattributes` (LF і на Windows), `.git-blame-ignore-revs` для коміту переформатування
- ESLint у `backend` (з правилами на типах: `no-floating-promises`, `no-misused-promises`, `await-thenable`) і `shared`; кореневий `npm run lint` перевіряє всі три workspace
- Тести транзакційної логіки без БД — `backend/src/repositories/__tests__/transactions.test.ts` (баланс + ledger RedCoins, масові оцінки й явка, проведення заняття)
- Скріншоти інтерфейсу в README (`docs/screenshots/`, десктоп і телефон), огляд можливостей і тестові акаунти після `seed`

### Changed
- **Міграція бази даних з MongoDB (Mongoose) на PostgreSQL (Prisma ORM), хостинг [Neon](https://neon.tech)**. Схема тепер реляційна: `id` — `uuid` замість `ObjectId`, масив `Group.teachers[]` замінено join-таблицею `GroupTeacher` (M:N), матеріали заняття винесено в окрему таблицю `LessonMaterial`. Кожна таблиця отримала `academy_id` — підготовка до майбутньої мульти-тенантності (зараз академія одна). Автентифікація лишилась власна на JWT — Supabase Auth не використовується
- Схема застосовується міграціями (`prisma migrate`) замість `prisma db push`; скрипт `prisma:push` прибрано
- `GET /coins/transactions` віддає історію сторінками: `?limit=` (20 за замовчуванням, максимум 100), `?cursor=`, `?groupId=`, відповідь `{ items, nextCursor }`. Раніше адмін отримував увесь ledger академії одним запитом, а `CoinsPage` фільтрувала його за групою на клієнті
- `CoinsPage`: історія транзакцій підвантажується кнопкою «Показати ще»; після нарахування нова транзакція з'являється згори без повторного завантаження історії й рейтингу
- Після мутацій сторінки більше не перечитують увесь список: оцінки, групи, студенти, викладачі й заняття оновлюються точково з відповіді сервера за `id`. Колонка «Середнє» в журналі рахується з тих самих оцінок, що й клітинки, — окремий запит `GET /grades/summary` журналу більше не потрібен
- Після входу користувач повертається на сторінку, з якої його відправили на логін (зокрема після протухлої сесії), а не завжди на головну
- Діалоги на телефоні обмежені висотою екрана й прокручуються; журнал і розклад гортаються горизонтально всередині картки, а не всією сторінкою
- Журнал оцінок і зведення середніх фільтрують оцінки групи через `lessonId IN (...)` замість JOIN на `lessons`: 30 → 5.5 мс і 33 → 1.4 мс на 200k оцінок (Postgres перестав сканувати всю таблицю `grades`)
- Переміщено `.github/1-task.yml` та `2-bug.yml` у `.github/ISSUE_TEMPLATE/` — GitHub не розпізнавав issue forms поза цією директорією
- Оновлено `README.md`, `CONTRIBUTING.md`, `IT_Academy_LMS_ТЗ.md` — прибрано застарілі згадки MongoDB/Mongoose, узгоджено git-flow в ТЗ з реальною моделлю гілок (`main`/`develop` + `feature/`/`fix/`/`chore/`)
- `login`, `GET /auth/me` і `PATCH /auth/me` віддають однакову публічну проєкцію користувача (разом із `phone`) — раніше кожен ендпоінт збирав свій набір полів
- Зміна пароля відкликає refresh-токени на інших пристроях і одразу видає нову пару поточній сесії, тому користувача більше не викидає з системи після зміни власного пароля
- CI: `format:check` → `build` → `lint` усіх workspace (раніше лише frontend) → `npm test`
- Увесь код відформатовано Prettier'ом — без зміни логіки
- `POST /users` вимагає пароль, форма створення студента чи викладача — теж (кнопка генерації вже була); при редагуванні порожній пароль, як і раніше, лишає поточний
- `GET /users` і `GET /attendance` валідують query Zod-схемами (`userFiltersSchema`, `attendanceFiltersSchema`), як решта списків
- ТЗ звірено з реалізацією: API (без неіснуючих `POST /auth/register` і `/groups/:id/students`, з `PATCH /auth/me`, `/grades/summary`, `/health`), матриця прав, структура frontend, дизайн-система з DESIGN.md замість палітри першої версії (`#E63946`, Inter)
- DESIGN.md: шаблон list-сторінки без власного H1, таблиця заголовків Header, брендова кнопка через `bg-[#C10000]` (токен `--primary` не бренд)
- CONTRIBUTING, CLAUDE.md і ТЗ описують реальну модель гілок: гілки від `main`, PR у `main`, `develop` немає

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
- Невірний пароль на логіні запускав рефреш токена, і замість «Невірний email або пароль» користувач бачив помилку рефрешу
- Провалений refresh: кожен паралельний запит розлогінював окремо, а запити, що летіли до логауту, запускали нове коло 401 → refresh → 401. Тепер сесія завершується один раз, з одним toast і переходом на вхід; збій мережі під час рефрешу більше не розлогінює
- Будь-яка помилка `GET /auth/me` при відкритті застосунку розлогінювала — тепер недоступний сервер показує екран з повтором, а не форму входу
- Вихід не завершував сесію, якщо сервер не відповів на `POST /auth/logout`
- Викладач без груп бачив вічний скелетон у журналі й RedCoins — тепер пояснення, чому даних немає
- Збої завантаження груп, студентів, викладачів і форм (списки груп/викладачів) падали лише в консоль — тепер користувач бачить помилку
- Кнопки редагування на картці викладача були видні лише при наведенні миші — на тач-екранах їх не було взагалі
- Одночасні списання RedCoins заводили баланс у мінус: баланс читався окремим `SELECT`, і обидва запити проходили перевірку (на Postgres 5 списань по 10 з балансу 10 давали −40). Умова балансу тепер у самому `UPDATE`
- Проведення заняття зберігало явку і статус двома транзакціями — збій між ними лишав заняття «запланованим» зі збереженою явкою. Тепер одна транзакція
- Скасоване заняття можна було «провести» через API — тепер 400, як і в UI
- Новий користувач без пароля отримував спільний пароль, записаний у коді
- Скидання пароля адміном не відкликало чужі сесії — тепер, як і зміна пароля самим користувачем, інкрементує `tokenVersion`
- 500 замість 400/404: id у шляху, що не є UUID (усі маршрути `/:id`), невалідні `groupId`/`lessonId` у query `/users` і `/attendance`, неіснуючий `relatedLessonId` у RedCoins, неіснуючий викладач чи група в `POST/PATCH /lessons`
- Адмін міг призначити викладачем заняття студента чи деактивованого викладача, а `PATCH /lessons/:id` переносив заняття в деактивовану групу
- Інструкція запуску в README ламалась на свіжому клоні: `seed`, backend і тести падали без згенерованого Prisma Client і зібраного `shared`
- Биті посилання в ТЗ: три якорі змісту й шляхи `../` на `schema.prisma` і CONTRIBUTING

---

## Як вести цей файл

- Помітна зміна — рядок у `[Unreleased]` у тому ж PR, що й сама зміна: `Added` — новий функціонал, `Changed` — зміна поведінки, рефакторинг, залежності, `Fixed` — виправлений баг, `Removed` — прибране.
- Пиши, що змінилось для користувача чи розробника і чому, а не назву файлу чи коміту.
- На реліз `[Unreleased]` стає версією з датою (`## [1.1.0] — YYYY-MM-DD`), над нею — новий порожній `[Unreleased]`, а на коміт релізу ставиться git-тег `v1.1.0`. Версія — за SemVer: нова можливість — minor (`1.1.0`), лише виправлення — patch (`1.0.1`), несумісна зміна API — major.

---

<!-- Підтримуй цей файл у актуальному стані — це допомагає команді бачити прогрес -->
