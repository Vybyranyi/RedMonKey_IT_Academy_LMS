# 🎨 Design System — RedMonKey IT Academy LMS

Цей документ описує дизайн-систему проекту: токени, палітру, типографіку, компоненти, патерни сторінок і правила реалізації. Він є **єдиним джерелом правди** для всіх, хто верстає UI.

---

## 📋 Зміст

1. [Загальна концепція](#1-загальна-концепція)
2. [Кольорова палітра](#2-кольорова-палітра)
3. [Типографіка](#3-типографіка)
4. [Відступи та сітка](#4-відступи-та-сітка)
5. [Border Radius](#5-border-radius)
6. [Тіні та глибина](#6-тіні-та-глибина)
7. [Layout: AppLayout](#7-layout-applayout)
8. [Sidebar](#8-sidebar)
9. [Header](#9-header)
10. [Сторінки — структура та патерни](#10-сторінки--структура-та-патерни)
11. [Компоненти](#11-компоненти)
12. [Стани та UX-патерни](#12-стани-та-ux-патерни)
13. [Іконографіка](#13-іконографіка)
14. [Адаптивність](#14-адаптивність)

---

## 1. Загальна концепція

**Стиль:** Clean Professional Dark-Accent — світлий основний інтерфейс із темним насиченим сайдбаром і червоними акцентами бренду.

**Характер:** Серйозний, але не нудний. Академічний, але сучасний. Інтерфейс має відчуватись як зручний інструмент для роботи, а не як корпоративний портал 2010-х.

**Атмосфера двох зон:**
- **Sidebar** (`#29425D`) — темно-синій, сфокусована навігація
- **Main area** (`#F8F9FA`) — світлий, просторий робочий простір

---

## 2. Кольорова палітра

### Бренд і акценти

| Назва | HEX | Tailwind клас | Де використовується |
|-------|-----|---------------|---------------------|
| **Brand Red** | `#C10000` | `bg-[#C10000]`, токен `primary` | Активний пункт навігації, primary CTA, іконка на плашці картки |
| **Brand Red Hover** | `#A00000` / `#BA0000` | `hover:bg-[#A00000]` | Hover-стан кнопки |
| **Brand Red Focus** | `#BA0000/20` | `focus-visible:ring-[#BA0000]/20`, токен `ring` | Ring фокусу на інпутах і кнопках |
| **Red Icon BG** | `#FEF2F2` (`red-50`) | `bg-red-50` | Фон під іконку в картці |

**Токени ShadCN** (`:root` у `frontend/src/index.css`) узгоджені з палітрою: `--primary` = `#C10000`, `--primary-foreground` = білий, `--ring` = `#BA0000`. Тож `bg-primary` / `text-primary` / `accent-primary`, дефолтні `<Button>` і `<Badge>` та фокус-кільця примітивів — брендові.

Брендову CTA-кнопку все одно пиши явним класом `bg-[#C10000] hover:bg-[#A00000] text-white` (так зроблено в усіх кнопках застосунку): дефолтний варіант `<Button>` на hover світлішає (`hover:bg-primary/80`), а за палітрою кнопка має темнішати до `#A00000`. Змінюється бренд — міняй і токени, і ці класи.

Блок `.dark` в `index.css` лишився дефолтним ShadCN: темної теми в застосунку немає, клас `.dark` ніде не вмикається.

### Sidebar / Auth-screen palette

| Назва | HEX | Tailwind клас | Де використовується |
|-------|-----|---------------|---------------------|
| **Sidebar BG** | `#29425D` | `bg-[#29425D]` | Sidebar, Login page background |
| **Sidebar Dark** | `#1A3150` | `bg-[#1A3150]` | Hover-стан nav item, UserProfileWidget BG |
| **Sidebar Deeper** | `#152744` | `bg-[#152744]` | Hover на UserProfileWidget |
| **Login Blob 1** | `#3D335A` | `bg-[#3D335A]` | Декоративна куля вгорі-праворуч на Login |
| **Login Blob 2** | `#1A3150` | `bg-[#1A3150]` | Декоративна куля внизу-ліворуч на Login |

### Нейтральні (основний контент)

| Назва | Tailwind клас | Де використовується |
|-------|---------------|---------------------|
| **Page BG** | `bg-[#F8F9FA]` | Фон основного контенту |
| **Card BG** | `bg-white` | Картки, модалки, попапи |
| **Page Title** | `text-[#1A2645]` | Заголовок H1 в Header |
| **Section Title** | `text-slate-900` | Заголовки карток і секцій (`h3`/`h4`); власного H1 сторінки не мають |
| **Body Text** | `text-slate-600`, `text-slate-700` | Основний текст |
| **Muted Text** | `text-slate-500`, `text-slate-400` | Підписи, дати, placeholders |
| **Sidebar Muted** | `text-[#8B9DB4]` | Мuted текст у sidebar, footer |
| **Sidebar Nav Text** | `text-slate-300` | Неактивні пункти меню |
| **Border** | `border-slate-100`, `border-slate-200` | Розподільники в картках |
| **Footer BG in Card** | `bg-slate-50/50` | Підвал картки (CardFooter) |
| **Avatar BG** | `#0070F3` | Avatar fallback (ініціали) |

### Семантичні кольори

| Стан | Tailwind клас | Де використовується |
|------|---------------|---------------------|
| **Active/Success** | `bg-emerald-50 text-emerald-700 border-emerald-200` | Badge "Активна" у GroupCard |
| **Inactive** | `bg-slate-100 text-slate-600` | Badge "Неактивна" |
| **Error BG** | `bg-red-50 text-red-600 border border-red-200` | Server error block на Login |
| **Destructive** | Tailwind `destructive` (oklch) | Валідаційні помилки форм |

### Оцінки (grade color coding)

| Діапазон | Колір |
|----------|-------|
| 10–12 | 🟢 Зелений |
| 7–9 | 🔵 Синій |
| 4–6 | 🟡 Жовтий |
| 1–3 | 🔴 Червоний |

---

## 3. Типографіка

**Шрифт:** `Geist Variable` (підключено через `@fontsource-variable/geist`)

```css
--font-sans: 'Geist Variable', sans-serif;
--font-heading: var(--font-sans);
```

### Ієрархія

| Рівень | Tailwind | Де застосовується |
|--------|----------|-------------------|
| `text-2xl md:text-[28px] font-extrabold` | `text-[#1A2645] tracking-tight` | Заголовок сторінки в Header — єдиний H1 на екрані |
| `text-[22px] font-bold` | `text-slate-900 tracking-tight` | Заголовок Card (Login CardTitle) |
| `text-xl font-bold` | `text-slate-800` | GroupCard назва |
| `text-[15px] font-extrabold` | `text-white tracking-wide` | Назва продукту в Sidebar |
| `text-[14px] font-medium` | `text-slate-500` | Підзаголовки, дата в Header |
| `text-[14px] font-semibold` | — | Nav items у Sidebar |
| `text-[13px] font-bold` | `text-white` | Ім'я юзера у UserProfileWidget |
| `text-[12px] font-semibold` | `text-[#8B9DB4]` | Кнопка "Згорнути" в Sidebar |
| `text-[11px] font-medium` | `text-slate-400` | Підпис "CRM Platform" у Sidebar |
| `text-sm font-medium` | `text-slate-700` | Labels у формах |
| `text-xs` | `text-destructive` | Помилки валідації |

---

## 4. Відступи та сітка

### AppLayout

```
┌─────────────────────────────────────────────────┐
│  Sidebar (w-65 = 260px / w-20 = 80px collapsed) │
│  + Main Area (flex-1)                            │
│    ├── Header: px-4 pt-6 (md: px-8 pt-10 pb-6)   │
│    └── main: px-4 pb-28 (md: px-8 pb-10)         │
│         max-w-[1400px] mx-auto                   │
└─────────────────────────────────────────────────┘
```

### Page spacing

| Елемент | Tailwind |
|---------|----------|
| Між секціями сторінки | `space-y-6` |
| Між заголовком і контентом | `space-y-1` (в Header), `space-y-0` у flex-row |
| Сітка карток | `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6` |
| Sidebar nav spacing | `space-y-1.5` |
| Card padding | `px-6 pb-6`, `px-6 pt-5` |
| Gap у flex рядах | `gap-2`, `gap-3`, `gap-3.5`, `gap-4` |

---

## 5. Border Radius

| CSS змінна | Розмір | Tailwind equiv. | Де використовується |
|------------|--------|-----------------|---------------------|
| `--radius` = `0.625rem` | ~10px | `rounded-[10px]` | Логотип у Sidebar |
| `--radius-lg` | 0.625rem | `rounded-lg` | Стандартний Card |
| `--radius-xl` | ~0.875rem | `rounded-xl` | Іконка-плашка у GroupCard |
| `--radius-2xl` | ~1.125rem | `rounded-[12px]` | Nav items у Sidebar |
| `--radius-3xl` | ~1.375rem | `rounded-[16px]` | UserProfileWidget, Card на Login |
| `--radius-4xl` | ~1.625rem | `rounded-[20px]` | Login Card (`rounded-[20px]`) |
| Кругле | — | `rounded-full` | Аватар, колапс-кнопка logout |

**Принцип:** чим більший елемент — тим більший radius. Маленькі UI-елементи (badge, input) = `rounded-md`. Картки = `rounded-xl` або `rounded-2xl`. Модалки = `rounded-[20px]`.

---

## 6. Тіні та глибина

| Клас | Де |
|------|----|
| `shadow-xl` | Sidebar (z-20) |
| `shadow-2xl` | Login Card |
| `shadow-md` | Активний nav item, GroupCard hover |
| `shadow-sm` | Логотип у Sidebar, UserProfileWidget, Login Button |
| `hover:shadow-md transition-shadow` | GroupCard (при hover) |
| `blur-xl opacity-90/80` | Login page decorative blobs |

---

## 7. Layout: AppLayout

```tsx
// flex: Sidebar | flex-1 (column)
<div className="flex bg-[#F8F9FA] min-h-dvh font-sans">
  <Sidebar />                                   {/* hidden md:flex */}
  <div className="flex-1 min-w-0 flex flex-col h-dvh overflow-hidden">
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[1400px] mx-auto">
        <Header />
        <main className="px-4 pb-28 md:px-8 md:pb-10">
          <ErrorBoundary key={pathname} fallback={...}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  </div>
  <BottomNav />                                 {/* md:hidden */}
</div>
```

**Важливо:**
- `h-dvh overflow-hidden` на wrapper + `flex-1 overflow-y-auto` на inner — так сайдбар і шапка залишаються фіксованими, а контент скролиться
- `min-w-0` на колонці контенту — без нього широка таблиця розпирає flex і дає горизонтальний скрол усієї сторінки
- `ErrorBoundary` з `key={pathname}` — помилка рендеру сторінки показує `ErrorState` на місці вмісту, Sidebar лишається робочим, перехід на інший розділ знімає помилку
- `max-w-[1400px] mx-auto` — обмежує ширину на великих моніторах

---

## 8. Sidebar

**Ширина:** `w-65` (~260px) / `w-20` (80px у collapsed-стані)  
**Фон:** `#29425D`  
**Transition:** `transition-all duration-300 ease-in-out`

### Анатомія

```
┌──────────────────┐
│  [Logo] IT Acad  │  ← pt-6 pb-4 px-6
│  CRM Platform    │
├──────────────────┤  ← h-px bg-slate-700/50 mx-4
│  🏠 Dashboard    │  ← rounded-[12px] px-4 py-3 gap-3.5
│  👥 Студенти     │     active: bg-[#C10000] text-white shadow-md
│  👨‍🏫 Викладачі   │     inactive: text-slate-300 hover:bg-[#1A3150]
│  ...             │
│  flex-1 space-y-1.5 overflow-y-auto px-3
├──────────────────┤
│  [← Згорнути]    │  ← text-[#8B9DB4] hover:text-white
│  [Avatar] Name   │  ← UserProfileWidget
│     Role         │
└──────────────────┘
```

### Nav items

- **Активний:** `bg-[#C10000] text-white shadow-md rounded-[12px]`
- **Неактивний:** `text-slate-300 hover:bg-[#1A3150] hover:text-white rounded-[12px]`
- **Іконка:** `h-4.5 w-4.5 strokeWidth={2.5}`
- **Текст:** `text-[14px] font-semibold truncate`

### UserProfileWidget

- Фон: `bg-[#1A3150] rounded-[16px]`
- Hover: `hover:bg-[#152744] hover:border-slate-700/50`
- Avatar ring: `ring-2 ring-[#29425D]`
- Avatar fallback BG: `#0070F3` (ініціали)
- Logout кнопка: з'являється при `group-hover` (opacity transition)
- У collapsed: logout – абсолютна кнопка `bg-[#C10000] rounded-full` у top-right

---

## 9. Header

**Padding:** `px-4 pt-6 pb-5`, від `md` — `px-8 pt-10 pb-6`  
**Layout:** `flex flex-col sm:flex-row sm:items-end justify-between gap-4`

Header сам визначає заголовок і підзаголовок за `location.pathname` (`getPageMeta` у `Header.tsx`) — сторінки власних H1 і підзаголовків не рендерять. Новий маршрут — новий `case` у `getPageMeta`.

### Анатомія

```
Вітаємо, Іван!                          [#header-actions]
П'ятниця, 25 вересня 2026
```

- **H1:** `text-2xl md:text-[28px] leading-tight font-extrabold text-[#1A2645] tracking-tight`
- **Підзаголовок:** `text-[14px] font-medium text-slate-500 mt-1` — дата на дашборді, опис розділу на решті сторінок
- **`#header-actions`** — порожній слот праворуч; зараз сторінки кнопки в нього не передають, дії стоять у рядку під Header

### Заголовки за маршрутами

| Шлях | Заголовок |
|------|-----------|
| `/` (усі ролі) | Вітаємо, {ім'я}! (підзаголовок — сьогоднішня дата) |
| `/students` | Студенти |
| `/teachers` | Викладачі |
| `/groups` | Групи |
| `/schedule` | Розклад занять |
| `/grades` | Журнал оцінок |
| `/coins` | RedCoins |
| `/profile` | Мій профіль |
| `/settings` | Налаштування |
| невідомий шлях | Сторінку не знайдено |
| роль не пускає | Доступ заборонено |

---

## 10. Сторінки — структура та патерни

### 10.1 LoginPage

**Фон:** `bg-[#29425D]` — той самий колір, що у Sidebar, утворює єдину брендову атмосферу.

```
┌────────────────────────────────────────┐
│  [Blob top-right]  [Blob bottom-left]  │  blur-xl, mix-blend-multiply
│                                        │
│         [Logo 80×80 rounded-18px]      │
│          IT Academy LMS                │
│          Платформа управління          │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │  Вхід до системи                 │  │
│  │  Введіть свої облікові дані      │  │
│  │                                  │  │
│  │  [Error block — якщо є]          │  │
│  │  Email     [🧑 input]            │  │
│  │  Пароль    [👁 input]            │  │
│  │  [          Увійти          ]    │  │
│  └──────────────────────────────────┘  │
│                                        │
│       © 2026 RedMonKey IT Academy      │
└────────────────────────────────────────┘
```

**Ключові деталі:**
- Card: `bg-white rounded-[20px] shadow-2xl border-0 max-w-105 p-2`
- Задній план: два абсолютні `div` `rounded-full blur-xl mix-blend-multiply` для атмосфери
- Logo: `h-20 w-20 rounded-[18px] overflow-hidden`
- Copyright footer: `text-xs font-medium text-[#7A8C9E]`

### 10.2 GroupsPage (еталон для list-сторінок)

```
┌─────────────────────────────────────────────────────┐
│  Групи                                  ← Header (H1)│
│  Управління академічними групами...     ← підзаголовок│
│                                                      │
│  [3 активних · 5 всього]           [+ Нова група]    │ ← рядок сторінки
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ GroupCard│  │ GroupCard│  │ GroupCard│           │
│  └──────────┘  └──────────┘  └──────────┘           │
│        grid-cols-1 md:grid-cols-2 lg:grid-cols-3     │
└─────────────────────────────────────────────────────┘
```

**Рядок сторінки** — лише лічильник і дія; заголовок і опис уже намалював Header:
```tsx
<div className="space-y-6">
  <div className="flex items-center justify-between">
    <Badge variant="secondary">N записів</Badge>
    {isAdmin && <Button>Дія</Button>}
  </div>
  {/* фільтри, сітка карток або таблиця */}
</div>
```

Якщо лічильника немає (`SchedulePage`), лишається сама кнопка: `<div className="flex justify-end">`.

**CTA кнопка (admin only)** — брендовий колір явним класом, як у решти CTA (див. розділ 2):
```tsx
<Button className="flex items-center gap-2 bg-[#C10000] hover:bg-[#A00000] text-white">
  <Plus className="h-4 w-4" /> Нова група
</Button>
```

### 10.3 Шаблон для всіх list-сторінок

| Елемент | Реалізація |
|---------|------------|
| Обгортка сторінки | `<div className="space-y-6">` |
| Рядок лічильника й дії | `flex items-center justify-between` |
| Заголовок і опис | не в сторінці — `getPageMeta` у `Header.tsx` |
| Counter badge | `<Badge variant="secondary">` |
| Grid карток | `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6` |
| Порожньо / помилка | `EmptyState` / `ErrorState` з `components/common/` |

---

## 11. Компоненти

### Card (GroupCard pattern)

```
┌────────────────────────────────────────┐ ← border-t-2 border-t-slate-200
│  [Title]  [Badge]           [🔴 icon] │  CardHeader, flex-row justify-between
│  [description line-clamp-2]           │
├────────────────────────────────────────┤ ← border-t border-slate-100
│  📅 01.09.2024 — 30.06.2025           │  CardContent
│  Викладач: Іван Петренко               │
│  [😊][😊][😊] +2 студ.               │  UserAvatarGroup
└────────────────────────────────────────┘
│  [          Переглянути склад  →      ]│  ← CardFooter bg-slate-50/50
└────────────────────────────────────────┘
```

**Деталі:**
- Верхня кольорова межа: `border-t-2 border-t-slate-200` (можна брендувати кольором)
- Іконка у header: `p-3 bg-red-50 text-primary rounded-xl` — червона іконка на блідо-червоній плашці (`text-primary` = `#C10000`)
- Badge активності: `bg-emerald-50 text-emerald-700 border-emerald-200` (active) / `bg-slate-100 text-slate-600` (inactive)
- Hover: `hover:shadow-md transition-shadow`
- Footer кнопка: `variant="ghost" size="sm" text-slate-600 hover:text-slate-900 font-semibold`

### Badge

| Варіант | Стилі |
|---------|-------|
| `variant="secondary"` | Default ShadCN secondary (counter) |
| Активна | `bg-emerald-50 text-emerald-700 border-emerald-200` |
| Неактивна | `bg-slate-100 text-slate-600` |

### Button (основний CTA)

```tsx
// Primary — для головних дій
<Button className="bg-[#BA0000] hover:bg-[#A00000] text-white rounded-md h-11 font-medium shadow-sm">

// З іконкою — «Додати студента», «Нова група»
<Button className="flex items-center gap-2 bg-[#C10000] hover:bg-[#A00000] text-white">
  <Plus className="h-4 w-4" /> Текст
</Button>

// Ghost — для дій у картках
<Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 font-semibold">
```

- Кожна червона кнопка — з явним `bg-[#C10000] hover:bg-[#A00000] text-white`, навіть якщо це дефолтний `<Button>`: без класу вона теж червона (токен `--primary`), але на hover світлішає замість темнішати
- Друга дія поруч із головною («Зберегти явку» біля «Позначити проведеним», видалення оцінки біля «Зберегти» в журналі) — `variant="outline"`, щоб у рядку була одна червона кнопка
- Фокус з клавіатури у всіх варіантів — червоне кільце з токена `--ring` (`#BA0000`)

### Input

```tsx
<Input
  className="pl-10 h-11 border-slate-200 rounded-md 
             focus-visible:ring-[#BA0000]/20 
             focus-visible:border-[#BA0000] 
             text-sm"
/>
```

- Висота: `h-11` (44px)
- Border: `border-slate-200` за замовчуванням, `border-destructive` при помилці
- Focus ring: брендовий `ring-[#BA0000]/20` + `border-[#BA0000]`
- Іконки в полі: ліворуч `pl-10` + абсолютне позиціонування, `text-slate-400`
- Нативний чекбокс (вибір викладачів у `GroupForm`): `accent-primary` — галочка брендового кольору

### Dialog / Modal

```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>Відкрити</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Заголовок модалки</DialogTitle>
    </DialogHeader>
    {/* Контент */}
  </DialogContent>
</Dialog>
```

- Стандартний ShadCN Dialog
- `DialogTitle` — назва дії, а не загальне "Форма"

### Avatar / UserAvatarGroup

- Аватар fallback: `bg-[#0070F3] text-white font-bold text-xs`
- Ring у sidebar: `ring-2 ring-[#29425D]`
- `UserAvatarGroup` — перекриваючі аватари зі стаком, `maxCount=5`

---

## 12. Стани та UX-патерни

### Loading states

- ShadCN `Skeleton` UI — замість порожніх місць під час завантаження. Форма скелетона повторює форму вмісту: картки — `h-72 rounded-xl`, рядки таблиці — `h-16 rounded-xl`
- Скелетон — лише для першого завантаження. Зміна фільтра чи пошуку лишає попередній список видимим (`opacity-60`), щоб таблиця не блимала на кожну літеру
- Після мутації скелетон не показуємо взагалі: зміна застосовується до локального стану одразу (оптимістично), а запис, що чекає підтвердження, приглушений (`opacity-60`/`animate-pulse`, «Зберігається…»)
- Кнопка Submit: текст змінюється на `"Вхід..."` / `"Збереження..."` + `disabled`

### Error states

**Server error (Login):**
```tsx
<div className="mb-5 p-3 bg-red-50 text-red-600 text-sm font-medium 
                rounded-lg border border-red-200 text-center">
  {serverError}
</div>
```

**Validation error (форми):**
```tsx
<p className="text-xs text-destructive">{errors.fieldName}</p>
```

**Збій завантаження, 404, 403 — `ErrorState`** (`components/common/ErrorState.tsx`): біла картка `rounded-xl border-slate-200`, іконка на плашці `bg-red-50 text-primary rounded-xl`, опційний код (`404`/`403`) червоним з розрядкою, заголовок `h3 text-xl font-bold text-[#1A2645]`, опис `text-sm text-slate-500`. `onRetry` додає червону кнопку «Спробувати знову».

### Empty states

- `EmptyState` (`components/common/EmptyState.tsx`): картка з `border-dashed border-slate-200`, іконка на сірій плашці `bg-slate-50 text-slate-400`, заголовок `text-slate-700 font-semibold`, опис `text-slate-400`, CTA-кнопки дочірніми елементами
- Текст пояснює, **чому** порожньо і що робити: «Груп ще немає» + «Створити першу групу» (admin), «Нікого не знайдено» + «Скинути фільтри», «Ви ще не закріплені за жодною групою» (викладач). Admin-only CTA ховаємо від інших ролей

### Toast notifications

- ShadCN `Sonner` — для підтверджень і нарахування RedCoins
- Помилки запитів — лише через `toastApiError`: однакові повідомлення паралельних запитів схлопуються в один toast, скасовані запити й завершена сесія не показуються

### Журнал оцінок (inline editing UX)

1. Клік на порожню клітинку → попап з числовим полем (1–12)
2. `Enter`/`Tab` → зберегти та перейти до наступного
3. `Escape` → скасувати
4. Hover → tooltip з деталями (хто/коли поставив)

---

## 13. Іконографіка

**Бібліотека:** `lucide-react`

| Іконка | Де використовується |
|--------|---------------------|
| `BookOpen` | Іконка групи в GroupCard |
| `Calendar` | Дата в GroupCard |
| `Plus` | Кнопка "Нова група" / "Додати" |
| `ChevronLeft`, `ChevronRight` | Кнопка collapse Sidebar |
| `LogOut` | Вихід у UserProfileWidget |
| `User` | Іконка email в LoginForm |
| `Eye`, `EyeOff` | Показ/приховання пароля |

**Розміри іконок:**
- Nav items: `h-4.5 w-4.5` (`strokeWidth={2.5}`)
- В кнопках: `h-4 w-4`
- У картках / інпутах: `h-4 w-4`, `h-5 w-5`
- Logout collapsed: `h-3 w-3`

---

## 14. Адаптивність

### Breakpoints (Tailwind defaults)

| Брейкпойнт | Ширина | Поведінка |
|------------|--------|-----------|
| `< md` | <768px | Sidebar прихований, замість нього `BottomNav`; H1 у Header — `text-2xl`, відступи сторінки `px-4` |
| `sm` | ≥640px | Header: `flex-col → flex-row` |
| `md` | ≥768px | Grid: `grid-cols-1 → grid-cols-2`; з'являється Sidebar, H1 — `text-[28px]`, відступи `px-8` |
| `lg` | ≥1024px | Grid: `grid-cols-2 → grid-cols-3`; Sidebar стартує розгорнутим |

### Sidebar collapse

- Desktop (`lg`+): sidebar видимий, стартує розгорнутим `w-65`, можна згорнути до `w-20`
- Планшет (`md`–`lg`): стартує згорнутим `w-20`, щоб не забирати третину ширини
- Mobile (`< md`): `BottomNav` унизу — `bg-[#29425D]`, 4 розділи з ТЗ (Головна / Розклад / Оцінки / Монети) + «Ще» (Sheet знизу, `rounded-t-[20px]`: профіль, решта розділів ролі, «Вийти»). Активний пункт — іконка на червоній плашці `bg-[#C10000] rounded-[12px]`. Під нижню панель у `main` зарезервовано `pb-28`

### Мобайл: що не має ламатися

- Жодного горизонтального скролу **всієї сторінки**. Широкий вміст (журнал, таблиця студентів, календар) гортається всередині своєї картки: `overflow-x-auto` на картці, `min-w-0` на flex-колонці layout
- Діалоги обмежені висотою екрана (`max-h-[calc(100dvh-2rem)] overflow-y-auto` у `DialogContent`)
- Дії, що з'являються на hover (кнопки на `TeacherCard`), на мобайлі видимі завжди: `opacity-100 md:opacity-0 md:group-hover:opacity-100`
- Висота layout — `h-dvh`/`min-h-dvh`, а не `h-screen`: на телефоні `100vh` включає панель браузера і ховає низ сторінки

### Login page

- `px-4` для padding на мобайлі
- `max-w-105` для card — обмежує ширину форми, центрується по горизонталі

---

## Чеклист перед здачею задачі з UI

- [ ] Кольори відповідають палітрі з цього документа
- [ ] Шрифт — Geist Variable, не системний
- [ ] Border radius відповідає рівню елемента
- [ ] Стан loading/empty/error реалізований
- [ ] Адаптивність перевірена на мобайлі
- [ ] Іконки — з `lucide-react` потрібного розміру
- [ ] Кнопки admin-only приховані для студентів і викладачів
- [ ] Форми мають валідацію (Zod + Formik) і коректне відображення помилок
