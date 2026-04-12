import re
from collections.abc import Callable

import bleach
import emoji


class Preprocessor:
    """Стандартный обработчик текстов.

    Подготавливает текст к векторизации, удаляя лишние данные.

    Для расширения обработки нужно:
    - Добавить новую функцию @staticmethod
    - Добавить её в список processors
    """

    _url_re = re.compile(r"https?://\S+|t\.me/\S+")
    _mention_re = re.compile(r"@\w+")
    _multi_ws_re = re.compile(r"\s+")

    @staticmethod
    def remove_html(text: str) -> str:
        return bleach.clean(text, tags=[], attributes={}, strip=True)

    @staticmethod
    def remove_emojis(text: str) -> str:
        return emoji.replace_emoji(text, replace="")

    @staticmethod
    def remove_urls(text: str) -> str:
        return Preprocessor._url_re.sub("", text)

    @staticmethod
    def remove_mentions(text: str) -> str:
        return Preprocessor._mention_re.sub("", text)

    @staticmethod
    def remove_multi_whitespaces(text: str) -> str:
        return Preprocessor._multi_ws_re.sub(" ", text).strip()

    processors: list[Callable[[str], str]] = [
        remove_html,
        remove_emojis,
        remove_urls,
        remove_mentions,
        remove_multi_whitespaces,
    ]

    @classmethod
    def preprocess(cls, texts: list[str]) -> list[str]:
        return [cls.preprocess_one(text) for text in texts]

    @classmethod
    def preprocess_one(cls, text: str) -> str:
        if not text or not isinstance(text, str):
            return ""

        for func in cls.processors:
            text = func(text)

        return text
