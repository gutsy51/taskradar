import html
import re


def safe_html(text: str, truncate_length: int = 300, suffix: str = "...") -> str:
    """
    Безопасно удаляет HTML-блоки и ссылки, исключая XSS-атаки и сломанный UI.

    :param text: Исходный текст, возможно, содержащий HTML.
    :param truncate_length: Длина текста после обрезки.
    :param suffix: Текст, добавляемый в конце обрезанного текста.
    :return: Безопасно экранированный и обрезанный текст.
    """

    if not text or not text.strip():
        return ""

    no_html_text = re.sub(r"<[^>]+>", "", text)
    no_urls_text = re.sub(r"https?://[^\s<>\"{}|\\^`\[\]]+", "", no_html_text)
    safe_text = html.escape(no_urls_text)

    if len(safe_text) <= truncate_length:
        return safe_text
    return safe_text[:truncate_length] + suffix
