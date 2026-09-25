# CLAUDE.md

Цей файл — контекст для Claude Code (та інших AI-агентів) при роботі в цьому репозиторії.

## Що це за проект

**RedMonKey IT Academy LMS** — навчальна LMS-система для обліку студентів, розкладу, журналу оцінок та внутрішньої гейміфікованої валюти **RedCoins**. Пише команда з 5 студентів як навчальний проєкт; ти (Claude) виступаєш у ролі ментора/пари для код-рев'ю та імплементації, а не єдиного автора — код має лишатися зрозумілим для студентів рівня "перший комерційний проєкт".

Повний опис вимог, ролей, ендпоінтів і UX — у [IT_Academy_LMS_ТЗ.md](./IT_Academy_LMS_ТЗ.md). Дизайн-система (кольори, типографіка, патерни компонентів) — у [DESIGN.md](./DESIGN.md). Правила гілок/комітів/PR — у [CONTRIBUTING.md](./CONTRIBUTING.md). **Читай ці файли перед великими змінами** — не дублюй їхній вміст тут, лише орієнтуйся.

⚠️ Стек у ТЗ і README історично описував MongoDB — це застаріло. Реальна БД — **PostgreSQL**, документи вже виправлено (2026-07-16), але якщо десь у коді/коментарях зустрінеш згадку Mongo/Mongoose/ObjectId — це залишок старої версії, довіряй `backend/prisma/schema.prisma`, а не тексту.

## Стек (актуальний)

| Рівень | Технологія |
|---|---|
| Frontend | React 19 + Vite 8 + TypeScript |
| UI | ShadCN UI (radix-ui) + Tailwind CSS 4 |
| Форми/валідація | Formik + Zod |
| State | Zustand |
| HTTP клієнт | Axios (з interceptor для refresh-токена) |
| Backend | Node.js + Express 5 + TypeScript (виконується через `tsx`, білд — `tsc`) |
| ORM / БД | **Prisma 6 → PostgreSQL**, хостинг **Neon** (pooled `DATABASE_URL` + direct `DIRECT_URL`) |
| Автентифікація | Власний JWT (access + refresh), **не** Supabase Auth/Auth0 |
| Пароль-хешування | bcryptjs |

Монорепо на npm workspaces: `backend`, `frontend`, `shared` (спільні TS-типи та enum'и, білдиться першим — `@redmonkey/shared`).

## Команди

```bash
npm install              # ставить залежності для всіх workspace-ів одразу
npm run dev               # shared (watch) + backend (nodemon/tsx) + frontend (vite), паралельно
npm run build              # build --workspaces (shared → backend → frontend)
npm test                     # Vitest у всіх workspace-ах (shared → backend → frontend)
npm run test -w backend       # тести одного workspace
npm run test:watch -w frontend # watch-режим
npm run lint                 # ESLint у shared, backend і frontend (-w <workspace> — в одному)
npm run format               # Prettier на весь монорепо; format:check — лише перевірка, як у CI
npm run seed -w backend      # тестові користувачі/групи (backend/src/scripts/seed.ts)

# Prisma (виконувати з backend/ або через -w backend)
npm run prisma:migrate -w backend -- --name <що_змінено>  # нова міграція після зміни schema.prisma
npm run prisma:deploy -w backend    # застосувати міграції з репозиторію (нова БД, чужі міграції, прод)
npm run prisma:status -w backend    # чи відстає БД від prisma/migrations
npm run prisma:generate -w backend  # регенерує Prisma Client
npm run prisma:studio -w backend    # GUI для перегляду даних
```

На свіжому клоні перед `seed` і `npm test` потрібні `npm run prisma:generate -w backend` (Prisma Client не генерується при `npm install`: схема лежить у `backend/prisma`, а не в корені) і `npm run build -w @redmonkey/shared` (`npm run dev` збирає shared сам через `predev`). Змінні, експортовані в shell, мають пріоритет над `.env` — і для backend, і для Prisma CLI, і для `seed`, який стирає базу.

Локальний запуск потребує `backend/.env` (з `backend/.env.example`) і `frontend/.env` (з `frontend/.env.example`). Без валідних `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` (≥32 символи, різні) backend впаде одразу при старті — це навмисна перевірка в `backend/src/config/env.ts`.

## Архітектура backend

Шарувата структура, суворий напрямок залежностей:

```
routes/  →  controllers/  →  services/  →  repositories/  →  lib/prisma.ts
```

- **`routes/*.routes.ts`** — тільки `authenticate`/`authorize(roles)` middleware + прив'язка до контролера. Авторизація на рівні ролі — тут; авторизація на рівні *конкретного запису* — у сервісі.
- **`controllers/*.controller.ts`** — розбір `req`, виклик сервісу, `try/catch` → `handleError(res, error, fallbackMessage)` (`backend/src/utils/errors.ts`). Не містять бізнес-логіки. Усе, що приходить від клієнта, розбирають хелпери з `utils/validation.ts`: тіло — `parseBody(schema)`, query — `parseQuery(schema)` (схеми в `shared`), `:id` — `parseIdParam(id, 'Групу не знайдено')`. Сирий рядок, що дійшов до Prisma, на колонці `uuid` дає P2023, тобто 500, а не 400/404.
- **`services/*.service.ts`** — бізнес-логіка. `access.policy.ts` — **єдине місце**, де живуть правила видимості записів (`canViewUser`, `canViewGroup`); нові перевірки доступу на рівні запису додавай туди, а не розкидай по контролерах.
- **`repositories/*.repository.ts`** — єдиний шар, що торкається Prisma Client (`backend/src/lib/prisma.ts`). Контролери/сервіси не імпортують Prisma напряму.
- Помилки — кидай `BadRequestError` / `UnauthorizedError` / `ForbiddenError` / `NotFoundError` (`utils/errors.ts`), вони мапляться на правильний HTTP-статус автоматично через `handleError`.
- **Ланцюжок middleware** (`src/app.ts`): `helmet` → `cors` → `apiLimiter` (на `/api/v1`) → `express.json({ limit: '1mb' })` → маршрути → `notFoundHandler` → `errorHandler`. Глобальний `errorHandler` (`middlewares/error.middleware.ts`) — страховка для того, що проскочило повз контролер (битий JSON → 400, завелике тіло → 413, невідомий маршрут → 404 у JSON); контролери й далі самі викликають `handleError` з контекстним текстом.
- **Rate-limit** (`middlewares/rateLimit.middleware.ts`): загальний 1000 запитів / 15 хв на IP, `/auth/login` — 10 **невдалих** спроб / 15 хв, `/auth/refresh` — 60 / 15 хв. Лічильники в пам'яті процесу. За проксі хостингу обов'язково `TRUST_PROXY=1` — інакше всі клієнти мають IP балансувальника і ділять один ліміт.
- **Транзакції — у репозиторіях.** Баланс RedCoins і запис у ledger — одна інтерактивна транзакція (`coinRepository.createWithBalance`), причому умова «вистачає монет» стоїть у самому `UPDATE ... WHERE red_coins >= сума`, а не в `SELECT` перед ним: під READ COMMITTED два одночасні списання інакше бачать однаковий баланс і обидва проходять. Масові оцінки/явка — пакетна `$transaction([...])`; проведення заняття кладе статус і явку в один пакет (`lessonRepository.completeWithAttendance` + `attendanceUpserts`). Тести — `repositories/__tests__/transactions.test.ts`.
- **Секрети `User`** (`passwordHash`, `tokenVersion`) читають лише `userRepository.findCredentialsByEmail` / `findCredentialsById` / `updatePassword` — для `auth.service`. Решта методів мають явний `select` без них, а кожен зв'язок на `User` в інших репозиторіях — власний `select`. Це перевіряє `repositories/__tests__/secret-fields.test.ts` (проганяє кожен метод кожного репозиторію), тож новий запит без `select` на `users` зламає CI.

### Auth

- Access-токен — короткоживучий (`JWT_ACCESS_EXPIRES`, дефолт 15m), у заголовку `Authorization: Bearer`.
- Refresh-токен — httpOnly cookie, довгоживучий (дефолт 7d), містить `tokenVersion`.
- Logout інкрементує `User.tokenVersion` → усі видані раніше refresh-токени (на всіх пристроях) миттєво стають невалідними (`auth.service.ts`). Так само — зміна пароля самим користувачем і скидання пароля адміном (`PATCH /users/:id`).
- Пароль нового користувача задає адмін (`POST /users` без пароля — 400); спільного пароля за замовчуванням немає.
- Реєстрації через публічний ендпоінт немає — користувачів створює `admin` (`POST /users`) або сід-скрипт.
- Фронтенд: `frontend/src/api/axios.ts` — interceptor ловить 401, чергує паралельні запити (`isRefreshing`/`failedQueue`), рефрешить токен один раз і повторює оригінальний запит. Якщо refresh відхилено (401/403) — сесія завершується **один раз** (`clearAuth` + toast), усі запити отримують `SessionExpiredError`, а 401 після логауту вже не запускає новий рефреш. Збій мережі під час рефрешу не розлогінює. `/auth/login`, `/auth/refresh`, `/auth/logout` рефреш не запускають — їхній 401 означає невірні облікові дані.

### База даних — важливі нюанси (не очевидні з коду)

- **Схема змінюється лише міграціями** (`backend/prisma/migrations/`, baseline `0_init` = стан, який раніше давав `db push`). `db push` більше не використовуємо. Процес і одноразовий перехід наявної БД (`migrate resolve --applied 0_init`) — у [`backend/prisma/MIGRATIONS.md`](./backend/prisma/MIGRATIONS.md).
- **Історія RedCoins — keyset-пагінація** (`coinRepository.findPage`): `{ items, nextCursor }`, курсор — id останньої транзакції, умова `created_at <= X AND (created_at < X OR id < Y)` будується вручну, а не через Prisma `cursor` (той генерує `OR`, з яким Postgres не стартує скан індексу з курсора). Група фільтрується через `studentId IN (...)`. Нових списків без `take` не додавай.
- **Фільтр оцінок за групою — через `lessonId IN (...)`, а не через зв'язок `lesson: { groupId }`**: зв'язок Prisma перетворює на JOIN, і Postgres сканує всю `grades` (~30 мс проти ~5 мс). Заміри й рішення щодо індексів — у [`backend/prisma/QUERY_PLANS.md`](./backend/prisma/QUERY_PLANS.md).
- **Single-tenant перехідний стан**: у кожній таблиці є `academy_id` (готовність до майбутньої мульти-тенантності), але академія в системі рівно одна. `academyRepository.getDefaultId()` її резолвить. Коли з'явиться друга академія — замінити на `actor.academyId` з JWT-пейлоада.
- **RLS не увімкнено**: увесь доступ до БД іде через `backend/src/lib/prisma.ts`, а `access.policy.ts` централізує правила авторизації — вони транслюються в RLS-політики майже 1:1, коли прийде час. Не покладайся на RLS зараз — авторизація повністю на рівні застосунку.
- **CHECK-обмеження не в БД**: `Grade.value` (1..12) і `CoinTransaction.amount` (≠ 0) валідуються лише на рівні застосунку (Prisma не вміє їх декларувати) — не забувай про валідацію Zod при додаванні нових ендпоінтів для оцінок/монет.
- `GroupTeacher` — join-таблиця M:N викладач↔група (заміна масиву `teachers[]` з Mongo-версії). `User.groupId` — пряме 1:N для студента.
- `id` — `uuid` скрізь.

## Архітектура frontend

- `pages/` — по одній сторінці на роут (`DashboardPage`, `GroupsPage`, `StudentsPage`, `TeachersPage`, `GradesPage`, `CoinsPage`, `SchedulePage`, `ProfilePage`, `SettingsPage`, `LoginPage`) плюс `NotFoundPage` (catch-all `*` усередині layout) і `ForbiddenPage` (її рендерить `ProtectedRoute`, коли роль не пускає).
- `components/ui/` — ShadCN-примітиви (не редагувати вручну під конкретну сторінку — розширюй композицією).
- `components/layout/` — `AppLayout` (Sidebar + Header + `BottomNav` на мобайлі), `UserProfileWidget`, `AppSkeleton`. Розділи й ролі для Sidebar і BottomNav — одне джерело, `navigation.ts`.
- `components/common/` — `EmptyState` (порожній список + CTA), `ErrorState` (404/403/збій завантаження, `onRetry` дає кнопку «Спробувати знову»), `ErrorBoundary`. Boundary два: у `App.tsx` навколо всього роутера і в `AppLayout` навколо `<Outlet />` з `key={pathname}` — впала сторінка не забирає навігацію.
- `components/features/` — фіча-специфічні складені компоненти.
- `api/*.ts` — тонкі функції над `axiosInstance` (з `api/axios.ts`), по одному файлу на ресурс (`auth.ts`, `users.ts`, `groups.ts`, `lessons.ts`, `grades.ts`, `attendance.ts`, `coins.ts`). GET-функції, які сторінки викликають в ефектах, приймають `{ signal }` — ефект створює `AbortController` і скасовує запит у cleanup. `apiGetGroups` кешований (`api/cache.ts`, 60 с, дедуплікація одночасних викликів); мутації груп і користувачів скидають кеш, `setAuth`/`clearAuth` чистять його повністю. Масив із кешу спільний — змінюй лише через копію.
- Помилки запитів показуй через `toastApiError(error, fallback)` з `utils/apiError.ts`, а не `toast.error(...)` напряму: він мовчить про скасовані запити й `SessionExpiredError` і дедуплікує однакові toast'и. Помилку первинного завантаження сторінки показуй inline через `ErrorState` з повтором (лічильник `loadAttempt` у залежностях ефекту).
- **Мутації — оптимістично або точково, без перезапиту всього списку.** Хелпери в `lib/optimistic.ts` (`replaceById`, `removeById`, `upsertById`, `createTempId`, тип `Pending<T>`) зберігають незмінені записи тими самими об'єктами — на цьому тримається `React.memo` рядків журналу (`GradeJournalRow` з порівнянням клітинок за вмістом) і відвідуваності (`AttendanceRow`). Колбеки, які йдуть у мемоізовані рядки, — `useCallback` з функціональним `setState`. Відкат при помилці — точковий (зворотна дельта, повернення попереднього запису), не знімок усього стану.
- `store/authStore.ts` — Zustand, тримає `user`/`accessToken`/`isAuthenticated`; `accessToken` дублюється в `localStorage` для відновлення сесії при перезавантаженні сторінки.
- `router/index.tsx` — React Router з захищеними маршрутами; `ProtectedRoute` приймає `allowedRoles` і використовується вкладено (спершу авторизація, далі — рівень ролі).
- **Теки `hooks/` немає** — дані компоненти тягнуть самі через `useEffect` + функції з `api/`; React Query в проєкті не використовується. Дерево тек — у розділі 5.1 ТЗ (синхронізоване з кодом у 6.4).
- Типи ролей/enum'ів (`UserRole`, `GradeType` тощо) і спільні інтерфейси (`IUser`, ...) імпортуються з `@redmonkey/shared`, а не дублюються локально.

## Дизайн-система (стисло — повна версія в [DESIGN.md](./DESIGN.md))

**Стиль:** Clean Professional Dark-Accent — світлий main-контент + темно-синій sidebar + червоні брендові акценти.

**Ключові кольори:**

| Роль | HEX / клас |
|---|---|
| Brand Red (primary CTA, активний nav) | `#C10000` (hover `#A00000`/`#BA0000`) |
| Sidebar BG | `#29425D` (hover `#1A3150`, deeper `#152744`) |
| Page BG | `#F8F9FA` |
| Card BG | `white` |
| Page title (H1 у Header) | `text-[#1A2645]` |
| Body text | `text-slate-600` / `text-slate-700` |
| Muted text | `text-slate-400` / `text-slate-500` |
| Success/Active badge | `bg-emerald-50 text-emerald-700 border-emerald-200` |
| Inactive badge | `bg-slate-100 text-slate-600` |
| Avatar fallback BG | `#0070F3` |
| Оцінки: 10–12 зелений · 7–9 синій · 4–6 жовтий · 1–3 червоний | |

**Типографіка:** шрифт `Geist Variable` (`@fontsource-variable/geist`), ніколи системний sans. Єдиний H1 на екрані — у `Header`: `text-[28px] font-extrabold text-[#1A2645]`. Заголовки секцій усередині сторінки — `h3`/`h4`, не `h1`.

**Border radius:** чим більший елемент — тим більший radius. Badge/Input — `rounded-md`. Card — `rounded-lg`/`rounded-xl`. Модалки — `rounded-[20px]`. Nav items у Sidebar — `rounded-[12px]`.

**Іконки:** тільки `lucide-react`. Nav items — `h-4.5 w-4.5 strokeWidth={2.5}`, у кнопках/картках — `h-4 w-4`.

**Заголовок сторінки — не в сторінці.** `components/layout/Header.tsx` сам визначає title і subtitle за `location.pathname` і рендерить їх для кожного роуту. Сторінка **не повинна** мати власного `<h1>` чи підзаголовка — інакше вони задублюються на екрані. Додаєш новий роут — додай його і в `getPageMeta` у `Header.tsx`.

**Патерн list-сторінки (еталон — `GroupsPage`, `StudentsPage`):**
```tsx
<div className="space-y-6">
  {/* заголовок і підзаголовок рендерить Header — тут лише лічильник і дія */}
  <div className="flex items-center justify-between">
    <Badge variant="secondary">N записів</Badge>
    <Button>Дія</Button> {/* тільки для admin — ховай за роллю */}
  </div>
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {/* картки */}
  </div>
</div>
```
Якщо лічильника немає (як у `SchedulePage`) — лишається сама кнопка через `<div className="flex justify-end">`.

**Card:** `border-t-2 border-t-slate-200`, іконка-плашка в хедері `p-3 bg-red-50 text-primary rounded-xl`, `hover:shadow-md transition-shadow`, footer `bg-slate-50/50`.

**`bg-primary` / `text-primary` — не бренд.** Токен `--primary` в `index.css` лишився дефолтним ShadCN (майже чорний). Брендова кнопка — явно `bg-[#C10000] hover:bg-[#A00000] text-white`; «Нова група» з `bg-primary` і `<Button>` без класу кольору (як «Перейти до розкладу» на дашборді студента) виходять темними.

**Input:** `h-11 border-slate-200 rounded-md focus-visible:ring-[#BA0000]/20 focus-visible:border-[#BA0000]`.

**Стани:** loading → ShadCN `Skeleton` (не спінер) + кнопка disabled з текстом `"Збереження..."`; error форми → `text-xs text-destructive`; server error → `bg-red-50 text-red-600 border border-red-200`; сповіщення → `Sonner` toast через `toastApiError`; порожні списки — `EmptyState` з CTA, збій завантаження — `ErrorState` з «Спробувати знову» (обидва в `components/common/`), не голий екран.

**Чекліст перед здачею UI-задачі:** кольори з палітри, шрифт Geist, radius за розміром елемента, стани loading/empty/error реалізовані, адаптивність (`sm`/`md`/`lg`) перевірена, іконки з lucide-react, admin-only кнопки приховані для інших ролей, форми — Zod + Formik з видимими помилками.

## Поточний стан реалізації

Тижні 1–5 з roadmap закриті — весь основний функціонал є і на backend, і на фронті:

| Домен | Backend | Frontend |
|---|---|---|
| auth | `/auth` — login/refresh/logout/me, `PATCH /me`, `PATCH /me/password` | `LoginPage`, `ProfilePage` |
| users | `/users` CRUD + `GET /users/:id/stats` | `StudentsPage`, `TeachersPage` |
| groups | `/groups` CRUD | `GroupsPage` |
| lessons | `/lessons` CRUD + `POST /lessons/:id/complete` | `SchedulePage` (календар, `LessonForm`, `LessonDetailsModal`) |
| attendance | `GET /attendance`, `POST /attendance/bulk`, `PATCH /attendance/:id` | `AttendanceList` усередині деталей заняття |
| grades | `/grades` CRUD + `POST /grades/bulk` + `GET /grades/summary` | `GradesPage` (`GradeJournal` з inline-editing, `BulkGradeForm`, `StudentGrades`) |
| coins | `/coins/transactions`, `/coins/leaderboard`, `/coins/students/:id/balance` | `CoinsPage` (`CoinAwardForm`, `CoinBalanceCard`, `CoinHistory`, `CoinLeaderboard`) |
| dashboard | `stats.repository.ts` | `DashboardPage` з контентом за роллю |

Лишився **тиждень 6 — полірування та здача** ([roadmap, розділ 7](./IT_Academy_LMS_ТЗ.md#тиждень-6-полірування-та-здача)). З п. 6.1 закрито безпеку backend (helmet, rate-limit, ліміт тіла, глобальний error-handler + 404, аудит секретних полів) і базу даних (міграції, `EXPLAIN` журналу й leaderboard). П. 6.2 (стійкість UI) закрито повністю: 404/403, ErrorBoundary, втрата сесії, Bottom Nav, loading/empty/error стани, кеш і скасування запитів, оптимістичні оновлення. П. 6.3 (якість коду і CI) закрито: ESLint у backend і shared, Prettier на весь монорепо, format/lint/build/test у CI, тести транзакцій, код-рев'ю з виправленнями. П. 6.4 (документація) закрито: README з інструкцією, перевіреною з чистого клону, і скріншотами (`docs/screenshots/`), ТЗ (API, матриця прав, структура frontend, дизайн-система) і DESIGN.md звірено з кодом, CHANGELOG — версія `1.0.0` з підсумком шести тижнів. Відкриті: деплой (з 6.1), демо-дані й сценарій презентації (6.5), дрібниці з 6.6. Перед новою задачею звіряйся саме з цим розділом — решта пунктів roadmap уже виконані.

Свідомі борги, зафіксовані окремо: RLS вимкнений, `SettingsPage` — заглушка (з empty state). `GET /grades/summary` лишився на backend, але журнал рахує середнє з уже завантажених оцінок і цей запит не робить.

## Тести

Раннер — **Vitest**, один на весь монорепо. Тести лежать у теках `__tests__/` поруч із кодом (`*.test.ts` / `*.test.tsx`) і **не торкаються ні БД, ні мережі**.

- `shared` — Zod-схеми: межі діапазонів і тексти помилок (`Grade.value` 1..12 і `CoinTransaction.amount ≠ 0` живуть лише тут, у БД CHECK-обмежень немає).
- `backend` unit — утиліти, `access.policy` (матриця ролей), сервіси з `vi.mock()` на репозиторії.
- `backend` репозиторії — `repositories/__tests__/secret-fields.test.ts`: аудит проєкцій (див. «Секрети `User`» вище); `transactions.test.ts`: що саме йде в одну транзакцію (фейковий `$transaction` дає колбеку окремий `tx`, тож запис повз транзакцію видно). Конкурентність фейк не відтворить — такі речі перевіряй на локальному Postgres.
- `backend` rate-limit — `src/__tests__/rateLimit.test.ts` окремим файлом: лічильники живуть у пам'яті модуля, а Vitest дає кожному файлу свіжий `app`, тож вичерпаний ліміт не зачіпає інші API-тести.
- `backend` API — `src/__tests__/api.test.ts`: supertest ганяє справжні маршрути, middleware, контролери й сервіси, а моки стоять на найглибшому шарі (репозиторії + `lib/prisma.js`). Тому `app` зібрано в `src/app.ts` окремо від `listen()` у `src/index.ts` — не зливай їх назад.
- `frontend` — jsdom + React Testing Library; HTTP підміняє адаптер axios (`axiosInstance.defaults.adapter`), а не реальні запити. Для сторінок є хелпер `src/test/apiMock.ts`: `installApi({ 'POST /grades': ... })`, `deferred()` (щоб перевірити стан UI, поки «сервер» думає), `httpError()`, `callsTo()` (що сторінка не перезапитала зайве).
- `backend/vitest.setup.ts` виставляє фіктивні JWT-секрети: без них `config/env.ts` падає прямо на імпорті.
- Тести виключені з `tsc`-білду через `exclude` у tsconfig-ах кожного workspace — не прибирай, інакше `npm run build` почне тягнути їх у `dist`.

Додаєш бізнес-логіку або правило доступу — додай тест; CI ганяє `npm test` на кожен PR.

## Конвенції коду

- Мова коду (змінні, функції, коментарі в коді) — **англійська**. Мова комунікації (PR, issue, коміти, код-рев'ю) — **українська**. Це навмисний вибір з CONTRIBUTING.md, не змінюй.
- Коміти — Conventional Commits (`feat(scope): ...`, `fix(scope): ...` тощо), докладно в [CONTRIBUTING.md](./CONTRIBUTING.md#-commit-messages).
- Гілки — `feature/`, `fix/`, `chore/`, `refactor/`, `docs/` префікс + короткий опис через дефіс, від `main`; PR — теж у `main` (гілки `develop` немає).
- Не пиши docstring-блоки чи очевидні коментарі — тільки там, де є неочевидний "чому" (як-от коментарі в `access.policy.ts` про RLS-майбутнє).
- Форматування — Prettier (`.prettierrc.json`: одинарні лапки, `;`, ширина 100). Не форматуються ShadCN-компоненти (`components/ui/`, щоб оновлення з CLI давали чистий дифф) і Markdown. Масове переформатування — в `.git-blame-ignore-revs`.
- ESLint — свій `eslint.config` у кожному workspace. У backend є правила на типах (`no-floating-promises`, `no-misused-promises`): вони ловлять забутий `await` на запиті до БД і `expect(...).rejects` без `await`. Типи тестів для лінтера — `backend/tsconfig.eslint.json`.
- CI (`.github/workflows/ci.yml`) при кожному PR/push у `main`/`develop`: `format:check` → `build` → `lint` (після build, бо правилам на типах потрібні Prisma Client і `shared/dist`) → `npm test`.

## Файли, які варто прочитати за потреби

| Файл | Коли читати |
|---|---|
| [IT_Academy_LMS_ТЗ.md](./IT_Academy_LMS_ТЗ.md) | Перед новим фічером — там ролі, API-контракт, roadmap |
| [DESIGN.md](./DESIGN.md) | Перед будь-якою UI-задачею — кольори, спейсинг, патерни компонентів |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Перед першим PR — гілки, коміти, код-рев'ю чекліст |
| [CHANGELOG.md](./CHANGELOG.md) | Помітна зміна — рядок у `[Unreleased]`; на реліз розділ стає версією |
| `backend/prisma/schema.prisma` | Джерело істини для схеми БД (актуальніше за розділ 3 ТЗ) |
