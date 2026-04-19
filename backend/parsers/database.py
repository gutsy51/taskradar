import hashlib
import re
from datetime import datetime
from typing import Optional

import bleach
import emoji
from django.db import transaction
from django.utils import timezone

_NEGOTIABLE_RE = re.compile(r'договор|по\s+запрос|not\s+specified', re.IGNORECASE)
_WHITESPACE_RE = re.compile(r'\s+')


def normalize_text(text: str) -> str:
    """Снимает HTML, emoji и лишние пробелы."""
    if not text:
        return ''
    text = bleach.clean(text, tags=[], strip=True)
    text = emoji.replace_emoji(text, replace='')
    return _WHITESPACE_RE.sub(' ', text).strip()


def compute_content_hash(title: str, desc: str) -> str:
    raw = (title or '').strip().lower() + '||' + (desc or '').strip().lower()
    return hashlib.md5(raw.encode('utf-8')).hexdigest()


def normalize_price_amount(price_str: str) -> Optional[int]:
    if not price_str:
        return None
    if _NEGOTIABLE_RE.search(price_str):
        return 0
    match = re.search(r'\d[\d\s\xa0]*', price_str)
    if match:
        return int(re.sub(r'\D', '', match.group()))
    return None


def init_db() -> None:
    """Совместимость с вызовами в tasks.py — при Django ORM ничего делать не нужно."""
    pass


def sync_projects(projects: list, source: str) -> dict:
    """
    Синхронизирует БД с текущим состоянием источника:
      - мягко удаляет (is_deleted=True) записи, которых больше нет на площадке
      - восстанавливает (is_deleted=False) записи, которые снова появились
      - добавляет новые записи

    Если парсер вернул пустой список — ничего не трогаем.
    Возвращает {'saved': int, 'deleted': int, 'restored': int}.
    """
    if not projects:
        return {'saved': 0, 'deleted': 0, 'restored': 0}

    from datasets.models import Post, Source

    source_obj, _ = Source.objects.get_or_create(
        name=source,
        defaults={'base_url': f'https://{source}'},
    )

    new_urls = [p.get('url', '') for p in projects if p.get('url')]

    with transaction.atomic():
        deleted = Post.objects.filter(
            source=source_obj,
            is_deleted=False,
        ).exclude(url__in=new_urls).update(is_deleted=True)

        restored = Post.objects.filter(
            source=source_obj,
            is_deleted=True,
            url__in=new_urls,
        ).update(is_deleted=False)

        saved = 0
        for project in projects:
            url = project.get('url', '')
            if not url:
                continue
            try:
                title = normalize_text(project.get('title', ''))
                description = normalize_text(project.get('description', ''))
                content_hash = compute_content_hash(title, description)

                raw_published = project.get('published_at')
                published_at = None
                if raw_published:
                    try:
                        naive = datetime.strptime(raw_published, '%Y-%m-%d %H:%M:%S')
                        published_at = timezone.make_aware(naive)
                    except (ValueError, TypeError):
                        pass

                _, created = Post.objects.get_or_create(
                    source=source_obj,
                    url=url,
                    defaults={
                        'title': title,
                        'description': description,
                        'price': normalize_price_amount(project.get('price', '') or ''),
                        'price_currency': project.get('currency', ''),
                        'content_hash': content_hash,
                        'published_at': published_at,
                        'is_deleted': False,
                    },
                )
                if created:
                    saved += 1
            except Exception as exc:
                print(f'[DB] Ошибка при сохранении проекта: {exc}')

    return {'saved': saved, 'deleted': deleted, 'restored': restored}
