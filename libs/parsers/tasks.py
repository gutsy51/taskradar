"""
Celery-задачи для запуска парсеров и сохранения результатов в SQLite.
"""
import sys
import os
from dataclasses import asdict

# Гарантируем, что папка с парсерами есть в sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from celery_app import app
from database import init_db, sync_projects


@app.task(name='tasks.run_fl_parser', bind=True, max_retries=2)
def run_fl_parser(self):
    """Парсинг FL.ru"""
    init_db()
    parser = None
    try:
        from fl_parser import FLParser
        parser = FLParser(headless=True, use_profile=False)
        parser.parse_all_projects()
        result = sync_projects(parser.projects_data, source='fl.ru')
        return {'status': 'ok', 'source': 'fl.ru', **result}
    except Exception as exc:
        print(f'[fl.ru] Ошибка: {exc}')
        raise self.retry(exc=exc, countdown=60)
    finally:
        if parser:
            parser.close()


@app.task(name='tasks.run_freelancejob_parser', bind=True, max_retries=2)
def run_freelancejob_parser(self):
    """Парсинг freelancejob.ru"""
    init_db()
    driver = None
    try:
        from freelancejob_parser import build_driver, page_url, navigate_and_wait, detect_max_page, scrape_jobs

        driver = build_driver(headless=True)

        first_url = page_url(1)
        ok = navigate_and_wait(driver=driver, url=first_url, wait_timeout=15, retries=3)
        if not ok:
            return {'status': 'error', 'source': 'freelancejob.ru', 'message': 'Не удалось загрузить стартовую страницу'}

        max_page = detect_max_page(driver)
        rows = scrape_jobs(
            driver=driver,
            start_page=1,
            end_page=max_page,
            delay_sec=0.5,
            wait_timeout=15,
            retries=3,
            first_page_already_loaded=True,
        )

        projects = [asdict(row) for row in rows]
        result = sync_projects(projects, source='freelancejob.ru')
        return {'status': 'ok', 'source': 'freelancejob.ru', **result}
    except Exception as exc:
        print(f'[freelancejob.ru] Ошибка: {exc}')
        raise self.retry(exc=exc, countdown=60)
    finally:
        if driver:
            driver.quit()


@app.task(name='tasks.run_freelance_ru_parser', bind=True, max_retries=2)
def run_freelance_ru_parser(self):
    """Парсинг freelance.ru"""
    init_db()
    parser = None
    try:
        from freelance_ru_parser import FreelanceRuParser
        parser = FreelanceRuParser(headless=True, use_profile=False)
        parser.parse_all_projects()
        result = sync_projects(parser.projects_data, source='freelance.ru')
        return {'status': 'ok', 'source': 'freelance.ru', **result}
    except Exception as exc:
        print(f'[freelance.ru] Ошибка: {exc}')
        raise self.retry(exc=exc, countdown=60)
    finally:
        if parser:
            parser.close()


@app.task(name='tasks.run_weblancer_parser', bind=True, max_retries=2)
def run_weblancer_parser(self):
    """Парсинг weblancer.net"""
    init_db()
    parser = None
    try:
        from weblancer_parser import WeblancerParser
        parser = WeblancerParser(headless=True, use_profile=False)
        parser.parse_all_orders()
        result = sync_projects(parser.orders_data, source='weblancer.net')
        return {'status': 'ok', 'source': 'weblancer.net', **result}
    except Exception as exc:
        print(f'[weblancer.net] Ошибка: {exc}')
        raise self.retry(exc=exc, countdown=60)
    finally:
        if parser:
            parser.close()


@app.task(name='tasks.run_workzilla_parser', bind=True, max_retries=2)
def run_workzilla_parser(self):
    """Парсинг workzilla.com (требует chrome_profile с авторизацией)"""
    init_db()
    parser = None
    try:
        from workzilla_parser import WorkZillaParser
        parser = WorkZillaParser(headless=True, use_profile=True)
        parser.parse_all_tasks()
        # tasks_data содержит поле duration, которого нет в общей схеме — просто игнорируем
        result = sync_projects(parser.tasks_data, source='workzilla.com')
        return {'status': 'ok', 'source': 'workzilla.com', **result}
    except Exception as exc:
        print(f'[workzilla.com] Ошибка: {exc}')
        raise self.retry(exc=exc, countdown=60)
    finally:
        if parser:
            parser.close()
