# Backend API проекта

## Настройка проекта

1. Скопируйте `.env.example` в `.env`, установите нужные переменные
2. Установите poetry:
    ```bash
   pip install poetry
    ```
3. Создайте окружение и установите зависимости: 
    ```bash
   poetry env activate
   poetry install
    ```
4. Настройте базу данных через pgAdmin или Docker ([подробнее](#настройка-бд))
5. Проведите миграции и создайте администратора:
    ```bash
    python manage.py migrate
    python manage.py createsuperuser
    ```
6. Запустите проект:
    ```bash
    python manage.py runserver
    ```
7. Запустите celery, если нужна работа сборщика данных: **@MoglaVOS, допиши тут потом**
    ```bash
    celery run ...
    ```

## Настройка БД

### Linux

1. Создайте базу данных и настройте в окружении `POSTGRES_*` переменные
2. Установите расширение `pgvector` для корректной работы семантического поиска:
    ```bash
    sudo apt install -y postgresql-common ca-certificates
    sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh
    sudo apt install postgresql-18-pgvector
    ```
3. Активируйте установленное расширение:
    ```bash
    psql -h localhost -p 5433 -d taskradar -U postgres --command='CREATE EXTENSION vector';
    ```

### Docker

Альтернативно, можно держать БД в докере (расширения устанавливаются автоматически):

```bash
docker compose --env-file backend/.env -f infra/docker-compose.postgres.yml up -d
```

> Подробнее про `pgvector` можно узнать на [GitHub](https://github.com/pgvector/pgvector)
