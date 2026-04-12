# Запуск парсеров

Парсеры находятся в `libs/parsers/`. Используют Celery + Redis для планирования задач, результаты сохраняются в SQLite (`libs/parsers/taskradar.db`).

## Требования

- Python 3.12+
- Poetry
- Redis (брокер для Celery)
- Google Chrome + ChromeDriver

## Установка

```bash
# Из корня проекта
poetry install
poetry shell
```

## Запуск Redis

```bash
docker run -d -p 6379:6379 redis:alpine
```

## Запуск Celery

Нужно два терминала, оба из `libs/parsers/` внутри `poetry shell`.

**Терминал 1 — воркер:**
```bash
celery -A celery_app worker --loglevel=info --pool=solo
```

**Терминал 2 — планировщик:**
```bash
celery -A celery_app beat --loglevel=info
```

После запуска beat парсеры будут запускаться автоматически каждый час.

## Расписание

| Парсер          | Сайт              | Минута запуска |
|-----------------|-------------------|----------------|
| FL.ru           | fl.ru             | :05            |
| FreelanceJob    | freelancejob.ru   | :10            |
| Freelance.ru    | freelance.ru      | :15            |
| Weblancer       | weblancer.net     | :20            |
| WorkZilla       | workzilla.com     | :25            |

## Запуск парсера вручную

```bash
celery -A celery_app call tasks.run_fl_parser
celery -A celery_app call tasks.run_freelancejob_parser
celery -A celery_app call tasks.run_freelance_ru_parser
celery -A celery_app call tasks.run_weblancer_parser
celery -A celery_app call tasks.run_workzilla_parser
```

## WorkZilla: первичная авторизация

WorkZilla требует входа через браузер. Запусти один раз перед использованием:

```bash
cd libs/parsers
python login_once.py
```

Авторизуйся в открывшемся Chrome — сессия сохранится в `chrome_profile/`.

## Проверка базы данных

```bash
python -c "
import sqlite3
conn = sqlite3.connect('libs/parsers/taskradar.db')
rows = conn.execute('SELECT source, COUNT(*) FROM projects GROUP BY source').fetchall()
for r in rows: print(r)
conn.close()
"
```

Или открой `taskradar.db` в [DB Browser for SQLite](https://sqlitebrowser.org/).

## Структура таблицы `projects`

| Поле        | Тип  | Описание                          |
|-------------|------|-----------------------------------|
| id          | INT  | Первичный ключ                    |
| title       | TEXT | Название проекта                  |
| description | TEXT | Описание                          |
| price       | TEXT | Бюджет                            |
| currency    | TEXT | Валюта (RUB, USD, EUR)            |
| url         | TEXT | Ссылка на проект                  |
| source      | TEXT | Агрегатор (fl.ru, weblancer.net…) |
| parsed_at   | TEXT | Дата и время парсинга             |
