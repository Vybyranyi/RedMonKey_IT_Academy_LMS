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
npm run lint -w frontend    # ESLint (у backend лінтера поки немає)
npm run seed -w backend      # тестові користувачі/групи (backend/src/scripts/seed.ts)

# Prisma (виконувати з backend/ або через -w backend)
npm run prisma:push -w backend     # db push — синхронізує schema.prisma з БД
npm run prisma:generate -w backend  # регенерує Prisma Client
npm run prisma:studio -w backend    # GUI для перегляду даних
```

Локальний запуск потребує `backend/.env` (з `backend/.env.example`) і `frontend/.env` (з `frontend/.env.example`). Без валідних `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` (≥32 символи, різні) backend впаде одразу при старті — це навмисна перевірка в `backend/src/config/env.ts`.

## Архітектура backend

Шарувата структура, суворий напрямок залежностей:

```
routes/  →  controllers/  →  services/  →  repositories/  →  lib/prisma.ts
```

- **`routes/*.routes.ts`** — тільки `authenticate`/`authorize(roles)` middleware + прив'язка до контролера. Авторизація на рівні ролі — тут; авторизація на рівні *конкретного запису* — у сервісі.
- **`controllers/*.controller.ts`** — розбір `req`, виклик сервісу, `try/catch` → `handleError(res, error, fallbackMessage)` (`backend/src/utils/errors.ts`). Не містять бізнес-логіки.
- **`services/*.service.ts`** — бізнес-логіка. `access.policy.ts` — **єдине місце**, де живуть правила видимості записів (`canViewUser`, `canViewGroup`); нові перевірки доступу на рівні запису додавай туди, а не розкидай по контролерах.
- **`repositories/*.repository.ts`** — єдиний шар, що торкається Prisma Client (`backend/src/lib/prisma.ts`). Контролери/сервіси не імпортують Prisma напряму.
- Помилки — кидай `BadRequestError` / `UnauthorizedError` / `ForbiddenError` / `NotFoundError` (`utils/errors.ts`), вони мапляться на правильний HTTP-статус автоматично через `handleError`.

### Auth

- Access-токен — короткоживучий (`JWT_ACCESS_EXPIRES`, дефолт 15m), у заголовку `Authorization: Bearer`.
- Refresh-токен — httpOnly cookie, довгоживучий (дефолт 7d), містить `tokenVersion`.
- Logout інкрементує `User.tokenVersion` → усі видані раніше refresh-токени (на всіх пристроях) миттєво стають невалідними (`auth.service.ts`).
- Реєстрації через публічний ендпоінт немає — користувачів створює `admin` (`POST /users`) або сід-скрипт.
- Фронтенд: `frontend/src/api/axios.ts` — interceptor ловить 401, чергує паралельні запити (`isRequesting`/`failedQueue`), рефрешить токен один раз і повторює оригінальний запит.

### База даних — важливі нюанси (не очевидні з коду)

- **Немає `prisma/migrations/`** — схема застосована через `prisma db push`, не `migrate dev` (тертя з Neon shadow-DB). Перед виходом у прод варто ініціалізувати нормальну міграційну історію.
- **Single-tenant перехідний стан**: у кожній таблиці є `academy_id` (готовність до майбутньої мульти-тенантності), але академія в системі рівно одна. `academyRepository.getDefaultId()` її резолвить. Коли з'явиться друга академія — замінити на `actor.academyId` з JWT-пейлоада.
- **RLS не увімкнено**: увесь доступ до БД іде через `backend/src/lib/prisma.ts`, а `access.policy.ts` централізує правила авторизації — вони транслюються в RLS-політики майже 1:1, коли прийде час. Не покладайся на RLS зараз — авторизація повністю на рівні застосунку.
- **CHECK-обмеження не в БД**: `Grade.value` (1..12) і `CoinTransaction.amount` (≠ 0) валідуються лише на рівні застосунку (Prisma не вміє їх декларувати) — не забувай про валідацію Zod при додаванні нових ендпоінтів для оцінок/монет.
- `GroupTeacher` — join-таблиця M:N викладач↔група (заміна масиву `teachers[]` з Mongo-версії). `User.groupId` — пряме 1:N для студента.
- `id` — `uuid` скрізь.

## Архітектура frontend

- `pages/` — по одній сторінці на роут (`GroupsPage`, `StudentsPage`, `TeachersPage`, `GradesPage`, `CoinsPage`, `SchedulePage`, `DashboardPage`, `SettingsPage`, `LoginPage`).
- `components/ui/` — ShadCN-примітиви (не редагувати вручну під конкретну сторінку — розширюй композицією).
- `components/layout/` — `AppLayout` (Sidebar + Header), `UserProfileWidget`.
- `components/features/` — фіча-специфічні складені компоненти.
- `api/*.ts` — тонкі функції над `axiosInstance` (з `api/axios.ts`), по одному файлу на ресурс (`groups.ts`, `users.ts`).
- `store/authStore.ts` — Zustand, тримає `user`/`accessToken`/`isAuthenticated`; `accessToken` дублюється в `localStorage` для відновлення сесії при перезавантаженні сторінки.
- `router/index.tsx` — React Router з захищеними маршрутами.
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

**Типографіка:** шрифт `Geist Variable` (`@fontsource-variable/geist`), ніколи системний sans. H1 сторінки — `text-3xl font-bold tracking-tight text-slate-900`; заголовок у Header — `text-[28px] font-extrabold text-[#1A2645]`.

**Border radius:** чим більший елемент — тим більший radius. Badge/Input — `rounded-md`. Card — `rounded-lg`/`rounded-xl`. Модалки — `rounded-[20px]`. Nav items у Sidebar — `rounded-[12px]`.

**Іконки:** тільки `lucide-react`. Nav items — `h-4.5 w-4.5 strokeWidth={2.5}`, у кнопках/картках — `h-4 w-4`.

**Патерн list-сторінки (еталон — `GroupsPage`):**
```tsx
<div className="space-y-6">
  <div className="flex items-center justify-between">
    <div>
      <div className="flex items-center gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Назва</h1>
        <Badge variant="secondary" className="mt-1">N записів</Badge>
      </div>
      <p className="text-slate-500">Підзаголовок</p>
    </div>
    <Button>Дія</Button> {/* тільки для admin — ховай за роллю */}
  </div>
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {/* картки */}
  </div>
</div>
```

**Card:** `border-t-2 border-t-slate-200`, іконка-плашка в хедері `p-3 bg-red-50 text-primary rounded-xl`, `hover:shadow-md transition-shadow`, footer `bg-slate-50/50`.

**Input:** `h-11 border-slate-200 rounded-md focus-visible:ring-[#BA0000]/20 focus-visible:border-[#BA0000]`.

**Стани:** loading → ShadCN `Skeleton` (не спінер) + кнопка disabled з текстом `"Збереження..."`; error форми → `text-xs text-destructive`; server error → `bg-red-50 text-red-600 border border-red-200`; сповіщення → `Sonner` toast; порожні списки — текстовий empty state з CTA, не голий екран.

**Чекліст перед здачею UI-задачі:** кольори з палітри, шрифт Geist, radius за розміром елемента, стани loading/empty/error реалізовані, адаптивність (`sm`/`md`/`lg`) перевірена, іконки з lucide-react, admin-only кнопки приховані для інших ролей, форми — Zod + Formik з видимими помилками.

## Поточний стан реалізації

Реалізовано (backend + frontend): **auth** (login/refresh/logout/me), **users** CRUD, **groups** CRUD.
Ще не реалізовано (є моделі в Prisma-схемі та сторінки-заглушки на фронті, але без API): **lessons/schedule**, **grades**, **attendance**, **coin transactions**. Плануй роботу над ними по [ТЗ, розділ 4](./IT_Academy_LMS_ТЗ.md) і [roadmap, розділ 7](./IT_Academy_LMS_ТЗ.md).

## Конвенції коду

- Мова коду (змінні, функції, коментарі в коді) — **англійська**. Мова комунікації (PR, issue, коміти, код-рев'ю) — **українська**. Це навмисний вибір з CONTRIBUTING.md, не змінюй.
- Коміти — Conventional Commits (`feat(scope): ...`, `fix(scope): ...` тощо), докладно в [CONTRIBUTING.md](./CONTRIBUTING.md#-commit-messages).
- Гілки — `feature/`, `fix/`, `chore/`, `refactor/`, `docs/` префікс + короткий опис через дефіс, від `develop`.
- Не пиши docstring-блоки чи очевидні коментарі — тільки там, де є неочевидний "чому" (як-от коментарі в `access.policy.ts` про RLS-майбутнє).
- CI (`.github/workflows/ci.yml`) при кожному PR/push у `main`/`develop` ганяє `npm run lint -w frontend` і `npm run build`. Backend-лінтера в CI немає (у `backend/package.json` немає `lint`-скрипта).

## Файли, які варто прочитати за потреби

| Файл | Коли читати |
|---|---|
| [IT_Academy_LMS_ТЗ.md](./IT_Academy_LMS_ТЗ.md) | Перед новим фічером — там ролі, API-контракт, roadmap |
| [DESIGN.md](./DESIGN.md) | Перед будь-якою UI-задачею — кольори, спейсинг, патерни компонентів |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Перед першим PR — гілки, коміти, код-рев'ю чекліст |
| [CHANGELOG.md](./CHANGELOG.md) | Після завершення тижня розробки — додай запис |
| `backend/prisma/schema.prisma` | Джерело істини для схеми БД (актуальніше за розділ 3 ТЗ) |
