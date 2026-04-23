import csv
import time
import re
import sys
import io
import random
from datetime import datetime, timedelta, date as date_cls
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
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
    except AttributeError:
        pass


class FLParser:
    """Парсер проектов с FL.ru"""

    def __init__(self, headless=True, use_profile=True):
        self.base_url = "https://www.fl.ru"
        self.projects_url = f"{self.base_url}/projects/"
        self.use_profile = use_profile
        self.driver = self._setup_driver(headless)
        self.projects_data = []

    def _setup_driver(self, headless):
        import os

        chrome_options = Options()

        if self.use_profile:
            profile_dir = os.path.abspath(os.path.join(os.getcwd(), "chrome_profile_fl"))
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
                driver.implicitly_wait(5)  # Ускорено: было 10 сек
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
        t = price_text.lower()
        if '₽' in price_text or 'руб' in t or 'rub' in t:
            return "RUB"
        elif '$' in price_text or 'usd' in t:
            return "USD"
        elif '€' in price_text or 'eur' in t:
            return "EUR"
        return ""

    def _parse_published_at(self, time_text: str, parse_time: datetime) -> str:
        """Преобразует текст времени публикации в дату YYYY-MM-DD.

        Обрабатывает:
          - "X минут назад"
          - "X час/часа/часов назад"
          - "X часов Y минут назад"
          - "сегодня, HH:MM"
          - "вчера, HH:MM"
          - "DD месяца, HH:MM"  (напр. "4 апреля, 09:06")
        """
        if not time_text:
            return parse_time.strftime('%Y-%m-%d')

        t = time_text.strip().lower()

        # "X часов Y минут назад"
        m = re.match(r'(\d+)\s+час[а-я]*\s+(\d+)\s+минут[а-я]*\s+назад', t)
        if m:
            total = int(m.group(1)) * 60 + int(m.group(2))
            return (parse_time - timedelta(minutes=total)).strftime('%Y-%m-%d')

        # "X часов/час/часа назад"
        m = re.match(r'(\d+)\s+час[а-я]*\s+назад', t)
        if m:
            return (parse_time - timedelta(hours=int(m.group(1)))).strftime('%Y-%m-%d')

        # "X минут назад"
        m = re.match(r'(\d+)\s+минут[а-я]*\s+назад', t)
        if m:
            return (parse_time - timedelta(minutes=int(m.group(1)))).strftime('%Y-%m-%d')

        # "сегодня, HH:MM"
        if t.startswith('сегодня'):
            return parse_time.strftime('%Y-%m-%d')

        # "вчера, HH:MM"
        if t.startswith('вчера'):
            return (parse_time - timedelta(days=1)).strftime('%Y-%m-%d')

        # "DD месяца, HH:MM"  e.g. "4 апреля, 09:06"
        months = {
            'января': 1, 'февраля': 2, 'марта': 3, 'апреля': 4,
            'мая': 5, 'июня': 6, 'июля': 7, 'августа': 8,
            'сентября': 9, 'октября': 10, 'ноября': 11, 'декабря': 12,
        }
        m = re.match(r'(\d+)\s+([а-я]+)', t)
        if m:
            month_name = m.group(2)
            if month_name in months:
                day, month = int(m.group(1)), months[month_name]
                year = parse_time.year
                try:
                    result = date_cls(year, month, day)
                    if result > parse_time.date():
                        result = date_cls(year - 1, month, day)
                    return result.strftime('%Y-%m-%d')
                except ValueError:
                    pass

        return parse_time.strftime('%Y-%m-%d')

    def _has_next_page(self):
        """Проверяет, есть ли следующая страница"""
        try:
            self.driver.find_element(By.CSS_SELECTOR, "a.fl-pagination-next")
            return True
        except NoSuchElementException:
            return False

    def _collect_project_links(self, max_pages=None):
        """Собирает ссылки на все проекты со всех страниц списка

        Args:
            max_pages: Максимальное количество страниц (None = парсить все страницы до конца)
        """
        print("=" * 60)
        print("Сбор ссылок на проекты...")
        print("=" * 60)

        all_links = []
        page = 1
        parse_time = datetime.now()

        while True:
            # Проверяем лимит страниц
            if max_pages is not None and page > max_pages:
                print(f"\nДостигнут лимит страниц: {max_pages}")
                break
            if page == 1:
                page_url = self.projects_url
            else:
                page_url = f"{self.projects_url}page-{page}/"

            print(f"\nСканирование страницы {page}: {page_url}")

            try:
                self.driver.get(page_url)
            except Exception as e:
                print(f"Ошибка загрузки: {e}")
                break

            try:
                WebDriverWait(self.driver, 3).until(  # Ускорено: было 30 сек
                    EC.presence_of_element_located((By.ID, "projects-list"))
                )
            except TimeoutException:
                print("ERROR: Таймаут загрузки списка проектов")
                break

            self._random_delay(0.3, 0.6)  # Ускорено: было 1.5-2.5

            try:
                projects_container = self.driver.find_element(By.ID, "projects-list")
                project_elements = projects_container.find_elements(By.CSS_SELECTOR, "div.b-post.b-page__lenta_item")

                # Если проектов нет на странице - заканчиваем
                if not project_elements:
                    print("Проекты не найдены на странице, сканирование завершено")
                    break

                page_links = []
                for project_element in project_elements:
                    try:
                        # Пропускаем вакансии
                        try:
                            type_span = project_element.find_element(
                                By.CSS_SELECTOR, "span.b-post__bold.b-layout__txt_inline-block"
                            )
                            if 'Вакансия' in type_span.text:
                                continue
                        except NoSuchElementException:
                            pass

                        title_element = project_element.find_element(By.CSS_SELECTOR, "h2.b-post__title a")
                        href = title_element.get_attribute('href')
                        if not href:
                            continue
                        if not href.startswith('http'):
                            href = self.base_url + href

                        # Дата публикации
                        published_at = parse_time.strftime('%Y-%m-%d')
                        try:
                            time_span = project_element.find_element(
                                By.CSS_SELECTOR, ".b-post__foot span.text-gray-opacity-4"
                            )
                            published_at = self._parse_published_at(time_span.text.strip(), parse_time)
                        except NoSuchElementException:
                            pass

                        # Цена со страницы списка
                        price_text = ""
                        try:
                            price_span = project_element.find_element(
                                By.CSS_SELECTOR, ".b-post__grid_price .text-4"
                            )
                            price_text = self.driver.execute_script(
                                "return arguments[0].textContent.trim()",
                                price_span
                            ) or ""
                        except NoSuchElementException:
                            pass

                        page_links.append((href, published_at, price_text))
                    except NoSuchElementException:
                        continue

                print(f"Найдено {len(page_links)} ссылок на странице {page}")
                all_links.extend(page_links)

            except Exception as e:
                print(f"Ошибка поиска проектов: {e}")
                break

            # Проверяем, есть ли следующая страница
            if max_pages is None:  # Если нет лимита, проверяем наличие следующей страницы
                if not self._has_next_page():
                    print(f"\nДостигнута последняя страница: {page}")
                    break

            # Переход на следующую страницу
            page += 1
            self._random_delay(0.5, 1.0)  # Ускорено: было 2.0-3.0

        print(f"\n{'=' * 60}")
        print(f"Всего собрано ссылок: {len(all_links)}")
        print("=" * 60)
        return all_links

    def _parse_project_detail(self, project_url, project_num, total_projects):
        """Парсит детальную страницу проекта"""
        if not self._check_driver_alive():
            return None, {
                'type': 'Driver Error',
                'message': 'Драйвер не отвечает (браузер мог быть закрыт)',
                'url': project_url,
                'num': project_num
            }

        try:
            self.driver.get(project_url)
            WebDriverWait(self.driver, 3).until(  # Ускорено: было 20 сек
                EC.presence_of_element_located((By.CLASS_NAME, "fl-project-content"))
            )
            self._random_delay(0.2, 0.4)  # Ускорено: было 0.5-1.0

            # Проверяем, выбран ли исполнитель
            try:
                executor_chosen = self.driver.find_elements(By.XPATH,
                    "//*[contains(text(), 'Заказчик выбрал исполнителя')]")
                if executor_chosen:
                    return None, {
                        'type': 'Skipped',
                        'message': 'Заказчик уже выбрал исполнителя',
                        'url': project_url,
                        'num': project_num
                    }
            except:
                pass

            project_data = {
                'title': '',
                'description': '',
                'price_amount': None,
                'currency': '',
                'url': project_url,
                'parsed_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }

            # Заголовок
            try:
                title_element = self.driver.find_element(By.CSS_SELECTOR, "h1.text-3, h1.text-md-1")
                project_data['title'] = title_element.text.strip()
            except NoSuchElementException:
                pass

            # Описание
            try:
                desc_element = self.driver.find_element(By.CSS_SELECTOR, ".fl-project-content__description-text")
                project_data['description'] = desc_element.text.strip()
            except NoSuchElementException:
                pass

            # Бюджет/Оплата
            try:
                price_text = ""
                # Ищем div который содержит "Бюджет:" или "Оплата:"
                try:
                    # Пробуем найти элемент с "Бюджет:"
                    budget_div = self.driver.find_element(By.XPATH,
                        "//div[contains(., 'Бюджет:') and (contains(@class, 'text-4') or contains(@class, 'flex-shrink-0'))]")

                    # Берем только первый span внутри этого div
                    try:
                        price_span = budget_div.find_element(By.XPATH, "./span[1]")
                        price_text = self.driver.execute_script(
                            "return arguments[0].textContent.trim()",
                            price_span
                        )
                    except NoSuchElementException:
                        # Если нет span, берем весь текст div и убираем "Бюджет:"
                        price_text = budget_div.text.replace('Бюджет:', '').strip().split('\n')[0]

                except NoSuchElementException:
                    # Пробуем найти элемент с "Оплата:"
                    payment_div = self.driver.find_element(By.XPATH,
                        "//div[contains(., 'Оплата:') and (contains(@class, 'text-4') or contains(@class, 'flex-shrink-0'))]")

                    try:
                        price_span = payment_div.find_element(By.XPATH, "./span[1]")
                        price_text = self.driver.execute_script(
                            "return arguments[0].textContent.trim()",
                            price_span
                        )
                    except NoSuchElementException:
                        price_text = payment_div.text.replace('Оплата:', '').strip().split('\n')[0]

                # Проверяем, не "по результатам собеседования" ли это
                if 'по результатам собеседования' in price_text.lower():
                    return None, {
                        'type': 'Skipped',
                        'message': 'Оплата по результатам собеседования',
                        'url': project_url,
                        'num': project_num
                    }

                if price_text:
                    project_data['currency'] = self._parse_currency(price_text)
                    project_data['price_amount'] = normalize_price_amount(price_text)
            except NoSuchElementException:
                pass


            return project_data, None

        except TimeoutException:
            return None, {
                'type': 'Timeout',
                'message': 'Таймаут загрузки страницы (20 сек)',
                'url': project_url,
                'num': project_num
            }
        except WebDriverException as e:
            return None, {
                'type': 'WebDriver Exception',
                'message': str(e)[:150],
                'url': project_url,
                'num': project_num
            }
        except Exception as e:
            return None, {
                'type': 'Unknown Error',
                'message': str(e)[:150],
                'url': project_url,
                'num': project_num
            }

    def parse_all_projects(self, max_projects=None, max_pages=None):
        """Парсит проекты с FL.ru

        Args:
            max_projects: Максимальное количество проектов для парсинга (None = без ограничений)
            max_pages: Максимальное количество страниц для сканирования (None = все страницы автоматически)
        """
        print("=" * 60)
        print("Start of FL.ru parsing")
        print("=" * 60)

        # Шаг 1: Собираем все ссылки со всех страниц
        project_links = self._collect_project_links(max_pages=max_pages)

        if not project_links:
            print("\nНе найдено проектов для парсинга")
            return

        if max_projects:
            project_links = project_links[:max_projects]

        # Шаг 2: Парсим детали каждого проекта
        print("=" * 60)
        print("Парсинг деталей проектов...")
        print("=" * 60)

        success_count = 0
        error_count = 0
        skipped_count = 0
        errors = []

        print(f"Projects found: {len(project_links)}")

        with tqdm(total=len(project_links), desc="Page Processing",
                  bar_format='{l_bar}{bar}| {n_fmt}/{total_fmt} [{elapsed}<{remaining}]',
                  ncols=80) as pbar:

            for i, (project_url, published_at, list_price_text) in enumerate(project_links, 1):
                project_data, error_info = self._parse_project_detail(project_url, i, len(project_links))

                if project_data:
                    project_data['published_at'] = published_at
                    if not project_data.get('price_amount') and list_price_text:
                        project_data['currency'] = self._parse_currency(list_price_text)
                        project_data['price_amount'] = normalize_price_amount(list_price_text)
                    self.projects_data.append(project_data)
                    success_count += 1
                else:
                    if error_info and error_info.get('type') == 'Skipped':
                        skipped_count += 1
                    else:
                        error_count += 1
                    if error_info:
                        errors.append(error_info)

                pbar.update(1)
                self._random_delay(0.3, 0.7)  # Ускорено: было 1.0-2.0

        print("=" * 60)
        print(f"Parsing complete! Successfully processed: {success_count}/{len(project_links)}")
        if skipped_count:
            print(f"Skipped (executor chosen): {skipped_count}")
        if error_count:
            print(f"Errors: {error_count}")
        print("=" * 60)

        if errors:
            non_skipped = [e for e in errors if e.get('type') != 'Skipped']
            if non_skipped:
                print(f"\nErrors encountered: {len(non_skipped)}")
                errors_by_type = {}
                for err in non_skipped:
                    errors_by_type.setdefault(err['type'], []).append(err)
                for err_type, err_list in errors_by_type.items():
                    print(f"\n{err_type}: {len(err_list)} error(s)")
                    for err in err_list[:3]:
                        print(f"  Project #{err['num']}: {err['message'][:80]}")
                    if len(err_list) > 3:
                        print(f"  ... and {len(err_list) - 3} more")

        print(f"\nTotal projects collected: {len(self.projects_data)}")
        print("=" * 60)

    def save_to_csv(self, filename='fl_projects.csv'):
        if not self.projects_data:
            print("\nNo data to save!")
            return

        try:
            with open(filename, 'w', newline='', encoding='utf-8-sig') as csvfile:
                fieldnames = ['title', 'description', 'price_amount', 'currency', 'url', 'parsed_at', 'published_at']
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(self.projects_data)
            print(f"\nData saved successfully to {filename}!")
            print(f"Total rows: {len(self.projects_data)}")
        except Exception as e:
            print(f"\nSave error: {e}")

    def close(self):
        if self.driver:
            self.driver.quit()
            print("Browser closed")


def main():
    parser = None

    try:
        parser = FLParser(headless=True, use_profile=False)  # Временно headless=False для отладки

        # Варианты использования:
        # parser.parse_all_projects()  # Спарсит ВСЕ страницы автоматически (до конца)
        # parser.parse_all_projects(max_pages=1)  # Спарсит только 1 страницу
        # parser.parse_all_projects(max_pages=3)  # Спарсит только 3 страницы
        # parser.parse_all_projects(max_projects=5)  # Спарсит только 5 проектов

        parser.parse_all_projects()  # Тест: 3 проекта для проверки
        parser.save_to_csv('fl_projects.csv')

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
