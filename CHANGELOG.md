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

### Changed
- **Міграція бази даних з MongoDB (Mongoose) на PostgreSQL (Prisma ORM), хостинг [Neon](https://neon.tech)**. Схема тепер реляційна: `id` — `uuid` замість `ObjectId`, масив `Group.teachers[]` замінено join-таблицею `GroupTeacher` (M:N), матеріали заняття винесено в окрему таблицю `LessonMaterial`. Кожна таблиця отримала `academy_id` — підготовка до майбутньої мульти-тенантності (зараз академія одна). Автентифікація лишилась власна на JWT — Supabase Auth не використовується
- Схема застосовується через `prisma db push` (міграційна історія `prisma/migrations/` ще не ініціалізована)
- Переміщено `.github/1-task.yml` та `2-bug.yml` у `.github/ISSUE_TEMPLATE/` — GitHub не розпізнавав issue forms поза цією директорією
- Оновлено `README.md`, `CONTRIBUTING.md`, `IT_Academy_LMS_ТЗ.md` — прибрано застарілі згадки MongoDB/Mongoose, узгоджено git-flow в ТЗ з реальною моделлю гілок (`main`/`develop` + `feature/`/`fix/`/`chore/`)

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
