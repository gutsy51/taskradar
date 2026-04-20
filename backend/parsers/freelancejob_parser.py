from __future__ import annotations

import argparse
import csv
import io
import re
import sys
import time
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Iterable, Optional
from urllib.parse import urljoin
from .database import normalize_price_amount

from tqdm import tqdm

if sys.platform == 'win32':
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
    except AttributeError:
        pass

from selenium import webdriver
from selenium.common.exceptions import NoSuchElementException, TimeoutException, WebDriverException
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

BASE_URL = "https://www.freelancejob.ru/projects/"
CARDS_CSS = "div.col-sm-9 div.x17"

PRICE_RE = re.compile(
    r"(?P<amount>[\d\s]+)\s*(?P<currency>руб\.|usd|eur|€|\$|₽|грн\.?|тенге|kzt)",
    re.IGNORECASE,
)
PAGE_RE = re.compile(r"/projects/p(?P<page>\d+)/")


DATE_RE = re.compile(r'Проект добавлен:\s*(\d{2})\.(\d{2})\.(\d{4})')


@dataclass(slots=True)
class JobRow:
    title: str
    description: str
    price_amount: Optional[int]
    currency: str
    url: str
    parsed_at: str
    published_at: Optional[str]


def build_driver(
    headless: bool = True,
    page_load_timeout: int = 25,
) -> webdriver.Chrome:
    options = Options()
    options.page_load_strategy = "eager"

    if headless:
        options.add_argument("--headless=new")

    options.add_argument("--window-size=1600,1200")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-background-networking")
    options.add_argument("--disable-background-timer-throttling")
    options.add_argument("--disable-breakpad")
    options.add_argument("--disable-component-update")
    options.add_argument("--disable-features=Translate,OptimizationHints,MediaRouter")
    options.add_argument("--disable-renderer-backgrounding")
    options.add_argument("--disable-sync")
    options.add_argument("--lang=ru-RU")
    options.add_argument("--mute-audio")
    options.add_argument("--blink-settings=imagesEnabled=false")
    options.add_argument("--log-level=3")
    options.add_experimental_option("excludeSwitches", ["enable-automation", "enable-logging"])
    options.add_experimental_option("useAutomationExtension", False)
    options.add_experimental_option(
        "prefs",
        {
            "profile.managed_default_content_settings.images": 2,
            "profile.default_content_setting_values.notifications": 2,
        },
    )

    driver = webdriver.Chrome(options=options)
    driver.set_page_load_timeout(page_load_timeout)
    return driver


def wait_for_cards(driver: webdriver.Chrome, timeout: int = 20) -> None:
    WebDriverWait(driver, timeout).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, CARDS_CSS))
    )


def navigate_and_wait(
    driver: webdriver.Chrome,
    url: str,
    wait_timeout: int,
    retries: int,
) -> bool:
    last_error: Exception | None = None

    for attempt in range(1, retries + 1):
        try:
            driver.get(url)
        except TimeoutException as exc:
            last_error = exc
            print(
                f"[WARN] Таймаут загрузки страницы: {url} "
                f"(попытка {attempt}/{retries}). Пробую остановить загрузку и продолжить."
            )
            try:
                driver.execute_script("window.stop();")
            except WebDriverException:
                pass
        except WebDriverException as exc:
            last_error = exc
            print(f"[WARN] Ошибка навигации {url} (попытка {attempt}/{retries}): {exc}")
            time.sleep(1.0)
            continue

        try:
            wait_for_cards(driver, timeout=wait_timeout)
            return True
        except TimeoutException as exc:
            last_error = exc
            print(
                f"[WARN] Карточки не появились на странице {url} "
                f"(попытка {attempt}/{retries})."
            )
            time.sleep(1.0)

    if last_error is not None:
        print(f"[WARN] Не удалось стабильно загрузить страницу: {url}. Последняя ошибка: {last_error}")
    return False


def normalize_space(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def parse_price_and_currency(budget_text: str) -> tuple[str, str]:
    budget_text = normalize_space(budget_text)
    if not budget_text:
        return "по договоренности", ""

    lowered = budget_text.lower()
    if "по договор" in lowered:
        return "по договоренности", ""

    match = PRICE_RE.search(budget_text)
    if match:
        amount = normalize_space(match.group("amount"))
        raw_currency = normalize_space(match.group("currency")).lower()
        price_currency_map = {
            "руб.": "руб.",
            "₽": "руб.",
            "usd": "USD",
            "$": "$",
            "eur": "EUR",
            "€": "€",
            "грн.": "грн.",
            "грн": "грн.",
            "тенге": "тенге",
            "kzt": "KZT",
        }
        column_currency_map = {
            "руб.": "RUB",
            "₽": "RUB",
            "usd": "USD",
            "$": "USD",
            "eur": "EUR",
            "€": "EUR",
        }
        price_currency = price_currency_map.get(raw_currency, raw_currency)
        currency = column_currency_map.get(raw_currency, "")
        return f"{amount} {price_currency}".strip(), currency

    budget_text = re.sub(r"^Бюджет:\s*", "", budget_text, flags=re.IGNORECASE)
    budget_text = re.sub(r"\s+За\s+проект$", "", budget_text, flags=re.IGNORECASE)
    budget_text = normalize_space(budget_text)
    return (budget_text or "по договоренности"), ""


def extract_cards(driver: webdriver.Chrome) -> list:
    cards = driver.find_elements(By.CSS_SELECTOR, CARDS_CSS)
    return [card for card in cards if card.find_elements(By.CSS_SELECTOR, "a.big")]


def parse_card(card, parsed_at: str) -> JobRow:
    blocks = card.find_elements(By.XPATH, "./div")

    title = ""
    description = ""
    price_amount = 0  # по договорённости по умолчанию
    currency = ""
    project_url = ""
    published_at = None

    if blocks:
        try:
            anchor = blocks[0].find_element(By.CSS_SELECTOR, "a.big")
            title = normalize_space(anchor.text)
            project_url = urljoin(BASE_URL, anchor.get_attribute("href"))
        except NoSuchElementException:
            pass

    if len(blocks) >= 2:
        description = normalize_space(blocks[1].text)

    try:
        price_str, currency = parse_price_and_currency(card.find_element(By.CSS_SELECTOR, "div.x18").text)
        price_amount = normalize_price_amount(price_str)
    except NoSuchElementException:
        price_amount, currency = 0, ""

    # Дата публикации из "Проект добавлен: DD.MM.YYYY в HH:MM"
    try:
        x20_text = card.find_element(By.CSS_SELECTOR, "div.x20").text
        m = DATE_RE.search(x20_text)
        if m:
            published_at = f"{m.group(3)}-{m.group(2)}-{m.group(1)}"
    except NoSuchElementException:
        pass

    return JobRow(
        title=title,
        description=description,
        price_amount=price_amount,
        currency=currency,
        url=project_url,
        parsed_at=parsed_at,
        published_at=published_at,
    )


def detect_max_page(driver: webdriver.Chrome) -> int:
    page_numbers = {1}
    for link in driver.find_elements(By.CSS_SELECTOR, "ul.pagination a[href]"):
        href = link.get_attribute("href") or ""
        match = PAGE_RE.search(href)
        if match:
            page_numbers.add(int(match.group("page")))
    return max(page_numbers)


def page_url(page_num: int) -> str:
    return BASE_URL if page_num == 1 else urljoin(BASE_URL, f"p{page_num}/")


def scrape_jobs(
    driver: webdriver.Chrome,
    start_page: int,
    end_page: int,
    delay_sec: float,
    wait_timeout: int,
    retries: int,
    first_page_already_loaded: bool,
) -> list[JobRow]:
    all_rows: list[JobRow] = []
    total_pages = end_page - start_page + 1

    print("=" * 60)
    print("Start of FreelanceJob.ru parsing")
    print(f"Pages to process: {total_pages}")
    print("=" * 60)

    with tqdm(total=total_pages, desc="Page Processing",
              bar_format='{l_bar}{bar}| {n_fmt}/{total_fmt} [{elapsed}<{remaining}]',
              ncols=80) as pbar:

        for current_page in range(start_page, end_page + 1):
            url = page_url(current_page)

            page_ready = False
            if first_page_already_loaded and current_page == start_page:
                try:
                    wait_for_cards(driver, timeout=wait_timeout)
                    page_ready = True
                except TimeoutException:
                    page_ready = False

            if not page_ready:
                ok = navigate_and_wait(
                    driver=driver,
                    url=url,
                    wait_timeout=wait_timeout,
                    retries=retries,
                )
                if not ok:
                    tqdm.write(f"[WARN] Page {current_page} skipped after {retries} retries.")
                    pbar.update(1)
                    continue

            cards = extract_cards(driver)
            if not cards:
                tqdm.write(f"[WARN] No jobs on page {current_page}. Skipping.")
                pbar.update(1)
                continue

            parsed_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            page_rows = [parse_card(card, parsed_at) for card in cards]
            all_rows.extend(page_rows)

            pbar.update(1)
            if delay_sec > 0:
                time.sleep(delay_sec)

    print("=" * 60)
    print(f"Parsing complete! Successfully processed: {len(all_rows)} jobs / {total_pages} pages")
    print("=" * 60)

    return all_rows


def write_csv(rows: Iterable[JobRow], output_path: str) -> None:
    rows = list(rows)
    if not rows:
        raise ValueError("Нет данных для записи в CSV.")

    fieldnames = ["title", "description", "price_amount", "currency", "url", "parsed_at", "published_at"]
    with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(asdict(row))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Парсер заказов с freelancejob.ru/projects/ в CSV без захода в карточки заказов."
    )
    parser.add_argument(
        "-o",
        "--output",
        default="freelancejob_projects.csv",
        help="Путь к итоговому CSV-файлу.",
    )
    parser.add_argument(
        "--start-page",
        type=int,
        default=1,
        help="С какой страницы начинать парсинг.",
    )
    parser.add_argument(
        "--end-page",
        type=int,
        default=0,
        help="До какой страницы парсить. 0 = определить автоматически по пагинации.",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.5,
        help="Пауза между страницами в секундах.",
    )
    parser.add_argument(
        "--wait-timeout",
        type=int,
        default=15,
        help="Сколько секунд ждать появления карточек заказов на странице.",
    )
    parser.add_argument(
        "--page-load-timeout",
        type=int,
        default=25,
        help="Сколько секунд ждать навигацию driver.get() до принудительного прерывания.",
    )
    parser.add_argument(
        "--retries",
        type=int,
        default=3,
        help="Сколько раз повторять загрузку страницы при таймауте/сбое.",
    )
    parser.add_argument(
        "--headed",
        action="store_true",
        help="Запуск браузера с видимым окном. По умолчанию используется headless-режим.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    if args.start_page < 1:
        print("[ERROR] --start-page должен быть >= 1", file=sys.stderr)
        return 1

    if args.retries < 1:
        print("[ERROR] --retries должен быть >= 1", file=sys.stderr)
        return 1

    driver = None
    try:
        driver = build_driver(
            headless=not args.headed,
            page_load_timeout=args.page_load_timeout,
        )

        first_page_url = page_url(args.start_page)
        ok = navigate_and_wait(
            driver=driver,
            url=first_page_url,
            wait_timeout=args.wait_timeout,
            retries=args.retries,
        )
        if not ok:
            print(f"[ERROR] Не удалось загрузить стартовую страницу: {first_page_url}", file=sys.stderr)
            return 1

        detected_max_page = detect_max_page(driver)
        target_end_page = args.end_page if args.end_page > 0 else detected_max_page

        if target_end_page < args.start_page:
            print("[ERROR] --end-page не может быть меньше --start-page", file=sys.stderr)
            return 1

        print(f"[INFO] Найдена пагинация до страницы: {detected_max_page}")
        print(f"[INFO] Будет обработан диапазон страниц: {args.start_page}..{target_end_page}")

        rows = scrape_jobs(
            driver=driver,
            start_page=args.start_page,
            end_page=target_end_page,
            delay_sec=args.delay,
            wait_timeout=args.wait_timeout,
            retries=args.retries,
            first_page_already_loaded=True,
        )
        write_csv(rows, args.output)
        print(f"[INFO] Готово. Сохранено строк: {len(rows)}")
        print(f"[INFO] CSV: {args.output}")
        return 0

    except (TimeoutException, WebDriverException, ValueError) as exc:
        print(f"[ERROR] {exc}", file=sys.stderr)
        return 1
    finally:
        if driver is not None:
            driver.quit()


if __name__ == "__main__":
    raise SystemExit(main())
