import csv
import time
import re
import sys
import io
import random
from datetime import datetime
from .database import normalize_price_amount
from tqdm import tqdm
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException
from selenium.webdriver.chrome.options import Options

if sys.platform == 'win32':
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', line_buffering=True)
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', line_buffering=True)
    except AttributeError:
        pass


class WeblancerParser:
    """Парсер заказов с Weblancer.net"""

    def __init__(self, headless=True, use_profile=False):
        self.base_url = "https://www.weblancer.net"
        self.freelance_url = f"{self.base_url}/freelance/"
        self.use_profile = use_profile
        self.driver = self._setup_driver(headless)
        self.orders_data = []

    def _setup_driver(self, headless):
        import os

        chrome_options = Options()

        if self.use_profile:
            profile_dir = os.path.abspath(os.path.join(os.getcwd(), "chrome_profile_weblancer"))
            os.makedirs(profile_dir, exist_ok=True)

            chrome_options.add_argument(f"--user-data-dir={profile_dir}")
            chrome_options.add_argument("--profile-directory=Default")
            chrome_options.add_argument("--disable-background-networking")
            chrome_options.add_argument("--disable-sync")

        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--window-size=1920,1080")
        chrome_options.add_argument(
            "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")

        chrome_options.add_argument("--disable-blink-features=AutomationControlled")
        chrome_options.add_argument("--log-level=3")
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation", "enable-logging"])
        chrome_options.add_experimental_option('useAutomationExtension', False)

        prefs = {
            "profile.default_content_setting_values.notifications": 2,
            "credentials_enable_service": False,
            "profile.password_manager_enabled": False
        }
        chrome_options.add_experimental_option("prefs", prefs)

        if headless:
            print("Mode: HEADLESS is TRUE")
            chrome_options.add_argument("--headless=new")
        else:
            print("Mode: HEADLESS is FALSE")
            chrome_options.add_argument("--start-maximized")

        print("Launch Chrome WebDriver...")

        max_attempts = 3
        for attempt in range(1, max_attempts + 1):
            try:
                driver = webdriver.Chrome(options=chrome_options)
                driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
                    "source": """
                        Object.defineProperty(navigator, 'webdriver', {
                            get: () => undefined
                        });
                    """
                })

                print("The browser started successfully!")
                return driver

            except Exception as e:
                print(f"ERROR: {str(e)[:100]}...")
                if attempt == max_attempts:
                    raise
                time.sleep(2)

    def _check_driver_alive(self):
        try:
            _ = self.driver.current_url
            return True
        except (WebDriverException, Exception):
            return False

    def _random_delay(self, min_seconds=1.0, max_seconds=3.0):
        delay = random.uniform(min_seconds, max_seconds)
        time.sleep(delay)

    def _parse_currency(self, price_text):
        if not price_text:
            return ""
        price_text = price_text.strip()
        if '$' in price_text:
            return "USD"
        elif '€' in price_text:
            return "EUR"
        elif '₽' in price_text or 'руб' in price_text.lower():
            return "RUB"
        elif '₴' in price_text:
            return "UAH"
        return ""

    def _has_next_page(self):
        """Проверяет, есть ли следующая страница"""
        try:
            next_btn = self.driver.find_element(By.CSS_SELECTOR, "button[aria-label='Next page']")
            return next_btn.get_attribute('disabled') is None
        except NoSuchElementException:
            return False

    def _detect_max_pages(self):
        """Определяет общее количество страниц из пагинации"""
        try:
            links = self.driver.find_elements(By.CSS_SELECTOR, "a[href*='page=']")
            max_page = 1
            for link in links:
                href = link.get_attribute('href') or ''
                m = re.search(r'page=(\d+)', href)
                if m:
                    max_page = max(max_page, int(m.group(1)))
            return max_page
        except Exception:
            return None

    def _parse_page_orders(self):
        """Парсит заказы с текущей страницы"""
        orders = []
        try:
            articles = self.driver.find_elements(By.TAG_NAME, "article")
        except Exception as e:
            print(f"Ошибка поиска заказов: {e}")
            return orders

        for article in articles:
            try:
                order = {
                    'title': '',
                    'description': '',
                    'price_amount': None,
                    'currency': '',
                    'url': '',
                    'parsed_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    'published_at': None,
                }

                # Заголовок и ссылка
                try:
                    title_link = article.find_element(By.CSS_SELECTOR, "h2 a")
                    order['title'] = title_link.text.strip()
                    href = title_link.get_attribute('href')
                    if href:
                        if not href.startswith('http'):
                            href = self.base_url + href
                        order['url'] = href
                except NoSuchElementException:
                    pass

                # Цена (не всегда есть)
                try:
                    price_elem = article.find_element(By.CSS_SELECTOR, "span.text-green-600")
                    raw_price = price_elem.text
                    order['price_amount'] = normalize_price_amount(raw_price)
                    order['currency'] = self._parse_currency(raw_price)
                except NoSuchElementException:
                    order['price_amount'] = 0

                # Описание
                try:
                    desc_elem = article.find_element(By.CSS_SELECTOR, "p.text-gray-600")
                    order['description'] = desc_elem.text.strip()
                except NoSuchElementException:
                    pass

                # Дата публикации — ищем span с паттерном DD.MM.YYYY среди footer-элементов
                try:
                    spans = article.find_elements(
                        By.CSS_SELECTOR, "div.flex.items-center.whitespace-nowrap span"
                    )
                    for span in spans:
                        m = re.match(r'(\d{2})\.(\d{2})\.(\d{4})$', span.text.strip())
                        if m:
                            order['published_at'] = f"{m.group(3)}-{m.group(2)}-{m.group(1)}"
                            break
                except NoSuchElementException:
                    pass

                if order['title'] or order['url']:
                    orders.append(order)

            except Exception:
                continue

        return orders

    def parse_all_orders(self, max_pages=None):
        """Парсит заказы с Weblancer.net

        Args:
            max_pages: Максимальное количество страниц (None = все страницы)
        """
        print("=" * 60)
        print("Start of Weblancer parsing")
        print("=" * 60)

        # Загружаем первую страницу, чтобы определить пагинацию
        try:
            self.driver.get(self.freelance_url)
            WebDriverWait(self.driver, 30).until(
                EC.presence_of_element_located((By.TAG_NAME, "article"))
            )
            self._random_delay(0.5, 1.0)
        except TimeoutException:
            print("ERROR: Timeout loading first page")
            return
        except Exception as e:
            print(f"Error loading first page: {e}")
            return

        page = 1
        first_loaded = True

        with tqdm(total=None, desc="Page Processing",
                  bar_format='{desc}: {n_fmt} pages [{elapsed}]') as pbar:

            while True:
                if max_pages is not None and page > max_pages:
                    break

                if not first_loaded:
                    cur_url = f"{self.freelance_url}?page={page}"
                    try:
                        self.driver.get(cur_url)
                        WebDriverWait(self.driver, 30).until(
                            EC.presence_of_element_located((By.TAG_NAME, "article"))
                        )
                        self._random_delay(0.5, 1.0)
                    except TimeoutException:
                        tqdm.write(f"ERROR: Timeout on page {page}")
                        break
                    except Exception as e:
                        tqdm.write(f"Error on page {page}: {e}")
                        break
                first_loaded = False

                page_orders = self._parse_page_orders()
                if not page_orders:
                    break

                self.orders_data.extend(page_orders)
                pbar.update(1)

                if not self._has_next_page():
                    break

                page += 1
                self._random_delay(0.5, 1.5)

        print("=" * 60)
        print(f"Parsing complete! Successfully processed: {len(self.orders_data)} orders")
        print("=" * 60)

    def save_to_csv(self, filename='weblancer_orders.csv'):
        if not self.orders_data:
            print("\nNo data to save!")
            return

        try:
            with open(filename, 'w', newline='', encoding='utf-8-sig') as csvfile:
                fieldnames = ['title', 'description', 'price_amount', 'currency', 'url', 'parsed_at', 'published_at']
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(self.orders_data)
            print(f"\nData saved successfully to {filename}!")
            print(f"Total rows: {len(self.orders_data)}")
        except Exception as e:
            print(f"\nSave error: {e}")

    def close(self):
        if self.driver:
            self.driver.quit()
            print("Browser closed")


def main():
    parser = None

    try:
        parser = WeblancerParser(headless=True, use_profile=False)

        # Варианты использования:
        # parser.parse_all_orders()           # Все страницы
        # parser.parse_all_orders(max_pages=1) # Только 1 страница
        # parser.parse_all_orders(max_pages=3) # Только 3 страницы

        parser.parse_all_orders()
        parser.save_to_csv('weblancer_orders.csv')

    except KeyboardInterrupt:
        print("\n\nParsing interrupted by the user")
    except Exception as e:
        print(f"\nCritical Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if parser:
            parser.close()


if __name__ == "__main__":
    main()
