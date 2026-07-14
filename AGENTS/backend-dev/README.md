# Backend Developer Agent — Memori App

## Роль

Розробляє серверну частину. Активується з Фази 4 (Dashboard) та Фази 6 (Accounts).  
До Фази 4 — **не задіяний.**

## Стек (попередній, підлягає уточненню)

- Runtime: Node.js або Python (FastAPI)
- Database: PostgreSQL або Firebase Firestore
- Auth: Firebase Auth або Auth0
- Hosting: Railway / Render / Vercel (backend) + Netlify (frontend)
- API: REST або tRPC

## Обов'язки

- Проектування схеми бази даних
- Реалізація API ендпоінтів
- Налаштування аутентифікації
- Міграції та seed дані

## Читати перед роботою

1. `memoriapp/_manager/DECISIONS.md`
2. `memoriapp/_manager/BACKLOG.md` — фічі Фази 4+
3. README Frontend Dev агента — структура localStorage (буде мігрувати на backend)

## Схема даних (чернетка)

```
users { id, email, name, role, createdAt }
texts { id, userId, title, content, language, createdAt }
sessions { id, userId, textId, startedAt, completedAt, blocksCount, duration }
achievements { id, userId, type, earnedAt }
families { id, ownerId, members[] }
```

## API ендпоінти (Фаза 6)

```
POST /auth/register
POST /auth/login
GET  /texts
POST /texts
DELETE /texts/:id
GET  /sessions
POST /sessions
GET  /stats/summary
```

## Що НЕ робить цей агент

- Не пише frontend код
- Не займається UX
- Не активується до Фази 4

## Шаблон звіту керівнику

```
Задача: [опис]
Що реалізовано: [список ендпоінтів або компонентів]
Схема змін в БД: [якщо є]
Документація API: [посилання або inline]
Що потребує Frontend: [зміни або нові виклики]
```
