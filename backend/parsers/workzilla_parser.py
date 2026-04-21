import csv
import time
import re
import sys
import io
import random
from datetime import datetime
from pathlib import Path
from .database import normalize_price_amount
from tqdm import tqdm
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException
from selenium.webdriver.chrome.options import Options

_PARSER_DIR = Path(__file__).resolve().parent

if sys.platform == 'win32':
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
    except AttributeError:
        pass


class WorkZillaParser:
    """Парсер заданий с Work-Zilla"""

    def __init__(self, headless=True, use_profile=True):
        self.base_url = "https://client.work-zilla.com"
        self.freelancer_url = f"{self.base_url}/freelancer"
        self.use_profile = use_profile
        self.driver = self._setup_driver(headless)
        self.tasks_data = []

    def _setup_driver(self, headless):
        import os

        chrome_options = Options()

        if self.use_profile:
            profile_dir = str(_PARSER_DIR / "chrome_profile")
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
                driver.implicitly_wait(10)
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

    def _extract_task_links(self):
        try:
            self.driver.get(self.freelancer_url)
        except Exception as e:
            print(f"Loading error: {e}")
            return []

        current = self.driver.current_url
        if 'login' in current or 'auth' in current or 'signin' in current:
            print(f"ERROR: Workzilla redirected to login page ({current}). "
                  "Run WorkZillaParser(headless=False) once to log in and save the session.")
            return []

        try:
            WebDriverWait(self.driver, 30).until(
                EC.presence_of_element_located((By.CLASS_NAME, "order-in-list"))
            )
        except TimeoutException:
            current = self.driver.current_url
            if 'login' in current or 'auth' in current or 'signin' in current:
                print(f"ERROR: Workzilla requires login. Current URL: {current}. "
                      "Run WorkZillaParser(headless=False) once to authenticate.")
            else:
                print(f"ERROR: Task List Load Timeout. Current URL: {current}")
            return []

        self._random_delay(1.5, 2.5)
        task_cards = self.driver.find_elements(By.CSS_SELECTOR, ".order-in-list[data-order-id]")

        task_links = []
        for i, card in enumerate(task_cards, 1):
            try:
                order_id = card.get_attribute("data-order-id")
                task_url = f"{self.base_url}/freelancer/{order_id}?from=detail"
                task_links.append(task_url)
            except Exception as e:
                print(f"Card error #{i}: {e}")
                continue

        print(f"Tasks found: {len(task_links)}")
        return task_links

    def _parse_time_duration(self, time_text):
        if not time_text:
            return ""
        return time_text.strip()

    def _parse_task_detail(self, task_url, task_num, total_tasks):
        if not self._check_driver_alive():
            return None, {
                'type': 'Driver Error',
                'message': 'Driver not responding (browser may have closed)',
                'url': task_url,
                'num': task_num
            }

        try:
            self.driver.get(task_url)
            WebDriverWait(self.driver, 20).until(
                EC.presence_of_element_located((By.CLASS_NAME, "order-top-menu-container"))
            )
            self._random_delay(0.5, 1.0)

            now = datetime.now()
            task_data = {
                'title': '',
                'description': '',
                'duration': '',
                'price_amount': None,
                'currency': 'RUB',
                'url': task_url,
                'parsed_at': now.strftime('%Y-%m-%d %H:%M:%S'),
                'published_at': now.strftime('%Y-%m-%d'),
            }

            try:
                title_element = self.driver.find_element(By.CSS_SELECTOR, ".order-top-menu-container .title")
                task_data['title'] = title_element.text.strip()
            except NoSuchElementException:
                pass

            try:
                time_element = self.driver.find_element(By.CSS_SELECTOR, ".order-time-container .time-title")
                task_data['duration'] = self._parse_time_duration(time_element.text)
            except NoSuchElementException:
                pass

            try:
                price_element = self.driver.find_element(By.CSS_SELECTOR, ".order-money-icon.param .param-title")
                task_data['price_amount'] = normalize_price_amount(price_element.text)
            except NoSuchElementException:
                pass

            try:
                desc_element = self.driver.find_element(By.CSS_SELECTOR, ".description .description-content")
                task_data['description'] = desc_element.text.strip()
            except NoSuchElementException:
                try:
                    desc_element = self.driver.find_element(By.CSS_SELECTOR, ".description .external-links-wrapper")
                    task_data['description'] = desc_element.text.strip()
                except:
                    pass

            if not task_data['title']:
                return None, {
                    'type': 'Incomplete',
                    'message': 'Неполные данные задания (заголовок не найден)',
                    'url': task_url,
                    'num': task_num
                }

            return task_data, None

        except TimeoutException:
            return None, {
                'type': 'Timeout',
                'message': 'Page load timeout after 20 seconds',
                'url': task_url,
                'num': task_num
            }
        except WebDriverException as e:
            return None, {
                'type': 'WebDriver Exception',
                'message': str(e)[:150],
                'url': task_url,
                'num': task_num
            }
        except Exception as e:
            return None, {
                'type': 'Unknown Error',
                'message': str(e)[:150],
                'url': task_url,
                'num': task_num
            }

    def parse_all_tasks(self, max_tasks=None):
        print("=" * 60)
        print("Start of Workzilla parsing")
        print("=" * 60)

        task_links = self._extract_task_links()

        if not task_links:
            print("\nNo parsing tasks found")
            return

        if max_tasks:
            task_links = task_links[:max_tasks]

        success_count = 0
        error_count = 0
        skipped_count = 0
        errors = []

        with tqdm(total=len(task_links), desc="Task Processing",
                  bar_format='{l_bar}{bar}| {n_fmt}/{total_fmt} [{elapsed}<{remaining}]',
                  ncols=80) as pbar:

            for i, task_url in enumerate(task_links, 1):
                task_data, error_info = self._parse_task_detail(task_url, i, len(task_links))

                if task_data:
                    self.tasks_data.append(task_data)
                    success_count += 1
                else:
                    if error_info and error_info.get('type') == 'Incomplete':
                        skipped_count += 1
                    else:
                        error_count += 1
                    if error_info:
                        errors.append(error_info)

                pbar.update(1)
                self._random_delay(1.0, 2.0)

        print("" + "=" * 60)
        print(f"Parsing complete! Successfully processed: {success_count}/{len(task_links)}")
        if skipped_count:
            print(f"Skipped (incomplete data): {skipped_count}")
        print("=" * 60)

        non_skipped_errors = [e for e in errors if e.get('type') != 'Incomplete']
        if non_skipped_errors:
            print(f"\nErrors encountered: {len(non_skipped_errors)}")
            errors_by_type = {}
            for err in non_skipped_errors:
                err_type = err['type']
                if err_type not in errors_by_type:
                    errors_by_type[err_type] = []
                errors_by_type[err_type].append(err)

            for err_type, err_list in errors_by_type.items():
                print(f"\n{err_type}: {len(err_list)} error(s)")
                for err in err_list:
                    print(f"  Task #{err['num']}")
                    print(f"    URL: {err['url']}")
                    print(f"    Details: {err['message']}")
                    print()

        print(f"Total tasks collected: {len(self.tasks_data)}")
        print("=" * 60)

    def save_to_csv(self, filename='workzilla_tasks.csv'):
        if not self.tasks_data:
            print("\nNo data to save!")
            return

        try:
            with open(filename, 'w', newline='', encoding='utf-8-sig') as csvfile:
                fieldnames = ['title', 'description', 'duration', 'price_amount', 'currency', 'url', 'parsed_at', 'published_at']
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(self.tasks_data)
            print(f"Data saved successfully!")
        except Exception as e:
            print(f"\nSave error: {e}")

    def close(self):
        if self.driver:
            self.driver.quit()
            print("Browser closed")


def main():
    parser = None

    try:
        parser = WorkZillaParser(headless=True, use_profile=True)
        parser.parse_all_tasks()  # parser.parse_all_tasks(max_tasks=5) - спарсит только 5 заданий
        parser.save_to_csv('workzilla_tasks.csv')

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
