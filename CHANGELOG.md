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
