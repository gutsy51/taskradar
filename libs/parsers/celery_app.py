from celery import Celery
from celery.schedules import crontab

app = Celery('taskradar_parsers', include=['tasks'])

app.conf.update(
    broker_url='redis://localhost:6379/0',
    result_backend='redis://localhost:6379/0',

    task_serializer='json',
    result_serializer='json',
    accept_content=['json'],

    timezone='Europe/Moscow',
    enable_utc=True,

    # На Windows Celery требует --pool=solo, prefork не поддерживается
    worker_pool='solo',

    # Расписание запуска парсеров (каждый час в :05 минут)
    beat_schedule={
        'parse-fl-hourly': {
            'task': 'tasks.run_fl_parser',
            'schedule': crontab(minute=5),
        },
        'parse-freelancejob-hourly': {
            'task': 'tasks.run_freelancejob_parser',
            'schedule': crontab(minute=10),
        },
        'parse-freelance-ru-hourly': {
            'task': 'tasks.run_freelance_ru_parser',
            'schedule': crontab(minute=15),
        },
        'parse-weblancer-hourly': {
            'task': 'tasks.run_weblancer_parser',
            'schedule': crontab(minute=20),
        },
        'parse-workzilla-hourly': {
            'task': 'tasks.run_workzilla_parser',
            'schedule': crontab(minute=25),
        },
    },
)
