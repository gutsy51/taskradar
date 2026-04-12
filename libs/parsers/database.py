import hashlib
import re
import sqlite3
import os
from datetime import datetime
from typing import Optional

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'taskradar.db')

_NEGOTIABLE_RE = re.compile(r'договор|по\s+запрос|not\s+specified', re.IGNORECASE)


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def compute_content_hash(title: str, desc: str) -> str:
    """MD5 от (title || desc) в нижнем регистре — для поиска дублей с разных источников."""
    raw = (title or '').strip().lower() + '||' + (desc or '').strip().lower()
    return hashlib.md5(raw.encode('utf-8')).hexdigest()


def normalize_price_amount(price_str: str) -> Optional[int]:
    """
    Нормализует строку цены в целое число.
      0    — "по договорённости" / не указана
      >0   — конкретная сумма
      None — не удалось распознать
    """
    if not price_str:
        return None
    if _NEGOTIABLE_RE.search(price_str):
        return 0
    # Берём первую группу цифр (пробелы/nbsp внутри — разделители тысяч, напр. "5 000")
    # Останавливаемся на первом не-цифровом символе, кроме пробела внутри числа
    match = re.search(r'\d[\d\s\xa0]*', price_str)
    if match:
        return int(re.sub(r'\D', '', match.group()))
    return None


def _migrate_schema(conn: sqlite3.Connection) -> None:
    """Добавляет недостающие колонки, удаляет устаревшие и создаёт индексы (идемпотентно)."""
    existing = {row[1] for row in conn.execute('PRAGMA table_info(projects)')}

    # Добавляем отсутствующие колонки
    new_columns = [
        ('content_hash', 'TEXT'),
        ('price_amount', 'INTEGER'),
        ('is_deleted',   'INTEGER DEFAULT 0'),
        ('published_at', 'TEXT'),
    ]
    for col_name, col_def in new_columns:
        if col_name not in existing:
            conn.execute(f'ALTER TABLE projects ADD COLUMN {col_name} {col_def}')

    # Бэкфил для строк, добавленных до миграции
    if 'content_hash' not in existing:
        rows = conn.execute('SELECT id, title, description FROM projects').fetchall()
        for row in rows:
            h = compute_content_hash(row['title'] or '', row['description'] or '')
            conn.execute('UPDATE projects SET content_hash = ? WHERE id = ?', (h, row['id']))

    if 'price_amount' not in existing and 'price' in existing:
        rows = conn.execute('SELECT id, price FROM projects').fetchall()
        for row in rows:
            amt = normalize_price_amount(row['price'] or '')
            conn.execute('UPDATE projects SET price_amount = ? WHERE id = ?', (amt, row['id']))

    # Удаляем колонку price через пересоздание таблицы (SQLite не поддерживает DROP COLUMN < 3.35)
    if 'price' in existing:
        conn.execute('''
            CREATE TABLE projects_new (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                title        TEXT,
                description  TEXT,
                currency     TEXT,
                url          TEXT,
                source       TEXT,
                parsed_at    TEXT,
                content_hash TEXT,
                price_amount INTEGER,
                is_deleted   INTEGER DEFAULT 0,
                published_at TEXT,
                UNIQUE(url, source)
            )
        ''')
        conn.execute('''
            INSERT INTO projects_new
                (id, title, description, currency, url, source, parsed_at,
                 content_hash, price_amount, is_deleted, published_at)
            SELECT id, title, description, currency, url, source, parsed_at,
                   content_hash, price_amount, is_deleted, published_at
            FROM projects
        ''')
        conn.execute('DROP TABLE projects')
        conn.execute('ALTER TABLE projects_new RENAME TO projects')

    conn.execute('CREATE INDEX IF NOT EXISTS idx_projects_content_hash ON projects(content_hash)')
    conn.execute('CREATE INDEX IF NOT EXISTS idx_projects_is_deleted   ON projects(is_deleted)')
    conn.execute('CREATE INDEX IF NOT EXISTS idx_projects_source       ON projects(source)')

    conn.commit()


def init_db() -> None:
    conn = get_connection()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS projects (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            title        TEXT,
            description  TEXT,
            currency     TEXT,
            url          TEXT,
            source       TEXT,
            parsed_at    TEXT,
            content_hash TEXT,
            price_amount INTEGER,
            is_deleted   INTEGER DEFAULT 0,
            published_at TEXT,
            UNIQUE(url, source)
        )
    ''')
    conn.commit()
    _migrate_schema(conn)
    conn.close()


def sync_projects(projects: list, source: str) -> dict:
    """
    Синхронизирует БД с текущим состоянием источника:
      - мягко удаляет (is_deleted=1) записи, которых больше нет на площадке
      - восстанавливает (is_deleted=0) записи, которые снова появились
      - добавляет новые записи

    Если парсер вернул пустой список — ничего не трогаем (защита от ошибок).
    Возвращает {'saved': int, 'deleted': int, 'restored': int}.
    """
    if not projects:
        return {'saved': 0, 'deleted': 0, 'restored': 0}

    new_urls = [p.get('url', '') for p in projects if p.get('url')]

    conn = get_connection()
    try:
        conn.execute('CREATE TEMP TABLE IF NOT EXISTS _sync_urls (url TEXT)')
        conn.execute('DELETE FROM _sync_urls')
        conn.executemany('INSERT INTO _sync_urls VALUES (?)', [(u,) for u in new_urls])

        # Мягкое удаление — записи, которых больше нет на источнике
        cursor = conn.execute(
            '''UPDATE projects
               SET is_deleted = 1
               WHERE source = ? AND is_deleted = 0
                 AND url NOT IN (SELECT url FROM _sync_urls)''',
            (source,),
        )
        deleted = cursor.rowcount

        # Восстановление — записи, которые снова появились
        cursor = conn.execute(
            '''UPDATE projects
               SET is_deleted = 0
               WHERE source = ? AND is_deleted = 1
                 AND url IN (SELECT url FROM _sync_urls)''',
            (source,),
        )
        restored = cursor.rowcount

        # Вставка новых записей
        saved = 0
        for project in projects:
            try:
                content_hash = compute_content_hash(
                    project.get('title', ''),
                    project.get('description', ''),
                )

                conn.execute(
                    '''
                    INSERT OR IGNORE INTO projects
                        (title, description, currency, url, source,
                         parsed_at, content_hash, price_amount, is_deleted, published_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
                    ''',
                    (
                        project.get('title', ''),
                        project.get('description', ''),
                        project.get('currency', ''),
                        project.get('url', ''),
                        source,
                        project.get('parsed_at', datetime.now().strftime('%Y-%m-%d %H:%M:%S')),
                        content_hash,
                        project.get('price_amount'),
                        project.get('published_at'),
                    ),
                )
                if conn.execute('SELECT changes()').fetchone()[0]:
                    saved += 1
            except Exception as exc:
                print(f'[DB] Ошибка при сохранении проекта: {exc}')

        conn.commit()
    finally:
        conn.close()

    return {'saved': saved, 'deleted': deleted, 'restored': restored}
