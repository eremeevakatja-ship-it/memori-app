# CLAUDE.md — Memori App

> Читається автоматично на початку кожної сесії Claude Code в цій папці.

## Початок сесії (обов'язково)

1. Прочитай `_manager/STATUS.md` — поточний стан і що зараз в роботі
2. Прочитай `_manager/README.md` — workflow, команда агентів, шаблон делегування
3. Прочитай `_manager/DECISIONS.md` — архітектурні рішення (чому саме так)
4. Прочитай `_manager/BACKLOG.md` — фічі за пріоритетом

## Ключове про проєкт

- Клієнтський PWA-додаток (vanilla JS), без бекенду, без бази даних, до сьогодні
- Прогрес користувача — тільки в його localStorage, не централізовано
- GitHub: https://github.com/eremeevakatja-ship-it/memori-app (публічний, GitHub Pages)
- Публічне посилання для тестувальників: https://eremeevakatja-ship-it.github.io/memori-app/
- Локальний перегляд: `python -m http.server 8765` у цій папці

## Публікація змін на GitHub

Push вимагає логіну в GitHub — це має робити User сама (вікно логіну не працює через агентський термінал). CEO готує коміти, User виконує `git push` у своєму терміналі (PowerShell / VS Code).
