"""
Запускает все парсеры по одному разу через Celery.
Использование: python run_all_once.py
Требует запущенного воркера: celery -A celery_app worker --loglevel=info --pool=solo
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from tasks import (
    run_fl_parser,
    run_freelancejob_parser,
    run_freelance_ru_parser,
    run_weblancer_parser,
    run_workzilla_parser,
)

PARSERS = [
    run_fl_parser,
    run_freelancejob_parser,
    run_freelance_ru_parser,
    run_weblancer_parser,
    run_workzilla_parser,
]

print("Queuing all parsers...")
for task in PARSERS:
    result = task.delay()
    print(f"  {task.name} → task id: {result.id}")
print(f"\nAll {len(PARSERS)} parsers queued. Watch the worker for progress.")
