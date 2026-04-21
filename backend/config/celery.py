import os
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('taskradar')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

app.conf.beat_schedule = {
    'parse-fl-hourly': {
        'task': 'parsers.tasks.run_fl_parser',
        'schedule': crontab(minute=5),
    },
    'parse-freelancejob-hourly': {
        'task': 'parsers.tasks.run_freelancejob_parser',
        'schedule': crontab(minute=10),
    },
    'parse-freelance-ru-hourly': {
        'task': 'parsers.tasks.run_freelance_ru_parser',
        'schedule': crontab(minute=15),
    },
    'parse-weblancer-hourly': {
        'task': 'parsers.tasks.run_weblancer_parser',
        'schedule': crontab(minute=20),
    },
    'parse-workzilla-hourly': {
        'task': 'parsers.tasks.run_workzilla_parser',
        'schedule': crontab(minute=25),
    },
    'vectorize-new-posts': {
        'task': 'parsers.tasks.vectorize_new_posts',
        'schedule': crontab(minute=35),  # через 10 мин после последнего парсера
    },
}
