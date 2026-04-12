"""
Скрипт для первичной авторизации на Work-Zilla
Запустите этот скрипт один раз, авторизуйтесь вручную в браузере,
и данные авторизации сохранятся для дальнейших запусков парсера
"""

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
import os
import time
import sys
import io

# Фикс кодировки для Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')


def login_to_workzilla():
    """Авторизация на Work-Zilla с сохранением сессии"""
    print("="*70)
    print("АВТОРИЗАЦИЯ НА WORK-ZILLA")
    print("="*70)
    print("\nЭтот скрипт откроет браузер Chrome для авторизации.")
    print("После авторизации данные сохранятся и парсер сможет работать")
    print("без повторного входа в систему.\n")
    print("="*70)

    # Путь к профилю Chrome (тот же, что использует парсер)
    profile_dir = os.path.join(os.getcwd(), "chrome_profile")
    print(f"\nПрофиль Chrome: {profile_dir}")
    os.makedirs(profile_dir, exist_ok=True)

    # Настройка Chrome
    chrome_options = Options()
    chrome_options.add_argument(f"--user-data-dir={profile_dir}")
    chrome_options.add_argument("--profile-directory=Default")
    chrome_options.add_argument("--start-maximized")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")

    print("\nЗапуск браузера...")
    driver = webdriver.Chrome(options=chrome_options)

    try:
        # Открываем страницу авторизации
        login_url = "https://client.work-zilla.com/account/login?ReturnUrl=%2Ffreelancer"
        print(f"Переход на страницу авторизации: {login_url}\n")
        driver.get(login_url)

        print("="*70)
        print("ИНСТРУКЦИЯ:")
        print("="*70)
        print("1. В открывшемся окне Chrome введите свой Email")
        print("2. Нажмите 'Продолжить'")
        print("3. Введите код из письма")
        print("4. Дождитесь загрузки страницы с заданиями")
        print("5. После успешной авторизации закройте это окно консоли")
        print("   (можно просто нажать Ctrl+C)")
        print("="*70)
        print("\nБраузер останется открытым. Авторизуйтесь в нём...")
        print("Данные авторизации автоматически сохранятся в профиль.\n")

        # Ждем пока пользователь авторизуется
        print("Ожидание авторизации...")
        print("(Нажмите Ctrl+C когда авторизуетесь)\n")

        # Проверяем каждые 5 секунд, авторизовался ли пользователь
        while True:
            time.sleep(5)
            current_url = driver.current_url

            # Если пользователь попал на страницу freelancer - значит авторизовался
            if "/freelancer" in current_url:
                print("\n" + "="*70)
                print("✓ АВТОРИЗАЦИЯ УСПЕШНА!")
                print("="*70)
                print(f"Текущий URL: {current_url}")
                print(f"\nДанные авторизации сохранены в: {profile_dir}")
                print("\nТеперь парсер сможет работать без повторной авторизации!")
                print("Браузер закроется через 5 секунд...")
                print("="*70)
                time.sleep(5)
                break

    except KeyboardInterrupt:
        print("\n\n" + "="*70)
        print("Авторизация прервана пользователем")
        print("="*70)

        # Проверим, успел ли пользователь авторизоваться
        try:
            current_url = driver.current_url
            if "/freelancer" in current_url or "work-zilla.com" in current_url:
                print("✓ Возможно, авторизация была выполнена")
                print(f"Данные сохранены в: {profile_dir}")
            else:
                print("⚠ Похоже, авторизация не была завершена")
                print("Запустите скрипт снова для повторной попытки")
        except:
            pass

        print("="*70)

    except Exception as e:
        print(f"\n❌ Ошибка: {e}")

    finally:
        print("\nЗакрытие браузера...")
        driver.quit()
        print("Готово!\n")


if __name__ == "__main__":
    login_to_workzilla()

    print("\n" + "="*70)
    print("СЛЕДУЮЩИЙ ШАГ:")
    print("="*70)
    print("Теперь можете запустить парсер:")
    print("  python workzilla_parser.py")
    print("или")
    print("  python example.py")
    print("\nПарсер автоматически использует сохраненную авторизацию!")
    print("="*70 + "\n")
