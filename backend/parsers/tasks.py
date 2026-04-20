from dataclasses import asdict

from celery import shared_task

from parsers.database import init_db, sync_projects
from parsers.vectorizer import build_cleaned_text, get_model


@shared_task(name='parsers.tasks.run_fl_parser', bind=True, max_retries=2)
def run_fl_parser(self):
    init_db()
    parser = None
    try:
        from parsers.fl_parser import FLParser
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


@shared_task(name='parsers.tasks.run_freelancejob_parser', bind=True, max_retries=2)
def run_freelancejob_parser(self):
    init_db()
    driver = None
    try:
        from parsers.freelancejob_parser import build_driver, page_url, navigate_and_wait, detect_max_page, scrape_jobs

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


@shared_task(name='parsers.tasks.run_freelance_ru_parser', bind=True, max_retries=2)
def run_freelance_ru_parser(self):
    init_db()
    parser = None
    try:
        from parsers.freelance_ru_parser import FreelanceRuParser
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


@shared_task(name='parsers.tasks.run_weblancer_parser', bind=True, max_retries=2)
def run_weblancer_parser(self):
    init_db()
    parser = None
    try:
        from parsers.weblancer_parser import WeblancerParser
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


@shared_task(name='parsers.tasks.run_workzilla_parser', bind=True, max_retries=2)
def run_workzilla_parser(self):
    init_db()
    parser = None
    try:
        from parsers.workzilla_parser import WorkZillaParser
        parser = WorkZillaParser(headless=True, use_profile=True)
        parser.parse_all_tasks()
        result = sync_projects(parser.tasks_data, source='workzilla.com')
        return {'status': 'ok', 'source': 'workzilla.com', **result}
    except Exception as exc:
        print(f'[workzilla.com] Ошибка: {exc}')
        raise self.retry(exc=exc, countdown=60)
    finally:
        if parser:
            parser.close()


@shared_task(name='parsers.tasks.vectorize_new_posts')
def vectorize_new_posts(batch_size: int = 64) -> dict:
    """Векторизует посты, у которых ещё нет PostVector, батчами."""
    from datasets.models import Post, PostVector

    posts = list(
        Post.objects.filter(is_deleted=False)
        .exclude(vector__isnull=False)
        .only('id', 'title', 'description', 'published_at')[:batch_size]
    )
    if not posts:
        return {'vectorized': 0}

    model = get_model()
    texts = [build_cleaned_text(p.title, p.description) for p in posts]
    vectors = model.encode(texts, batch_size=32, show_progress_bar=False, normalize_embeddings=True)

    post_vectors = [
        PostVector(
            post=post,
            cleaned_text=text,
            vector=vector.tolist(),
            published_at=post.published_at,
        )
        for post, text, vector in zip(posts, texts, vectors)
    ]
    PostVector.objects.bulk_create(post_vectors, ignore_conflicts=True)

    return {'vectorized': len(post_vectors)}
