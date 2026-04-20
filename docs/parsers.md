# Запуск парсеров

Парсеры находятся в `backend/parsers/`. Интегрированы в Django, используют Celery + Redis, результаты сохраняются в PostgreSQL.

## Требования

- Python 3.13 + Poetry
- Docker Desktop (PostgreSQL + Redis)
- Google Chrome + ChromeDriver

## Установка зависимостей

```powershell
cd backend
poetry install
```

## Запуск окружения

**1. PostgreSQL** (из `infra/`):
```powershell
docker compose -f docker-compose.postgres.yml up -d
```

**2. Redis**:
```powershell
docker run -d -p 6379:6379 --name taskradar-redis redis:alpine
```

**3. Миграции** (первый раз, из `backend/`):
```powershell
python manage.py migrate
```

## Запуск Celery

Из `backend/`:

**Терминал 1 — воркер:**
```powershell
celery -A config worker --pool=solo -l info
```

**Терминал 2 — планировщик:**
```powershell
celery -A config beat -l info
```

## Расписание (каждый час)

| Парсер       | Сайт            | Минута |
|--------------|-----------------|--------|
| FL.ru        | fl.ru           | :05    |
| FreelanceJob | freelancejob.ru | :10    |
| Freelance.ru | freelance.ru    | :15    |
| Weblancer    | weblancer.net   | :20    |
| WorkZilla    | workzilla.com   | :25    |
| Векторизация | —               | :35    |

## Запуск парсера вручную

```powershell
# Из backend/
python manage.py shell
```

```python
from parsers.tasks import run_fl, run_freelancejob, run_freelance_ru, run_weblancer, run_workzilla
run_fl.delay()
```

Или через Celery CLI:
```powershell
celery -A config call parsers.tasks.run_fl
```

## WorkZilla: первичная авторизация

WorkZilla требует входа через браузер. Запусти один раз:

```powershell
cd backend
python -m parsers.workzilla_parser --login
```

Авторизуйся в открывшемся Chrome — сессия сохранится в `chrome_profile/`.

## Очистка зависших задач в Redis

Если воркер был прерван через Ctrl+C — задача могла остаться в очереди:

```powershell
celery -A config purge
```

## Проверка данных в БД

```powershell
docker exec -it taskradar-postgres psql -U postgres -d taskradar -c "SELECT source_id, COUNT(*) FROM dataset_posts GROUP BY source_id;"
```
