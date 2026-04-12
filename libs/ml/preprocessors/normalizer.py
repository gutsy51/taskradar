import logging
import re
from functools import lru_cache
from pathlib import Path

from libs.utils import run_with_timer

import pymorphy3

from .preprocessor import Preprocessor

logger = logging.getLogger(__name__)


class Normalizer:
    """Singleton-интерфейс для нормализации текста (pymorphy3 + stop-words).

    Инициализируйте сервис с помощью load() перед использованием!
    """

    __instance = None
    __morph: pymorphy3.MorphAnalyzer | None = None
    __stopwords: set[str] | None = None

    __STOPWORDS_PATH = Path(__file__).parent / "data" / "stopwords.txt"

    __RE_CLEAN_TEXT = re.compile(r"[^а-яА-Яa-zA-Z0-9\-/ ]")

    def __new__(cls) -> "Normalizer":
        if cls.__instance is None:
            cls.__instance = super().__new__(cls)

        return cls.__instance

    @classmethod
    @run_with_timer(logger=logger, level=logging.DEBUG)
    def load(cls) -> None:
        if cls.__morph is not None or cls.__stopwords is not None:
            logger.warning("Normalizer уже загружен")
            return

        morph = pymorphy3.MorphAnalyzer()
        stopwords = cls.__get_stopwords(cls.__STOPWORDS_PATH)

        cls.__morph = morph
        cls.__stopwords = stopwords

        logger.info(f"Normalizer загружен ({len(cls.__stopwords)} стоп-слов)")

    def normalize(self, text: str) -> list[str]:
        text = self.__clean_text(text)
        tokens = []
        for word in text.split():
            lemma = self.__lemmatize(word)

            if lemma and lemma not in self.__require_stopwords():
                tokens.append(lemma)

        return tokens

    @staticmethod
    def __get_stopwords(path: Path) -> set[str]:
        with open(path, encoding="utf-8") as f:
            return {line.strip() for line in f if line.strip()}

    def __clean_text(self, text: str) -> str:
        text = Preprocessor.preprocess_one(text)
        text = self.__RE_CLEAN_TEXT.sub(" ", text)

        return text.lower()

    @lru_cache(maxsize=50000)  # noqa: B019
    def __lemmatize(self, word: str) -> str:
        return self.__require_morph().parse(word)[0].normal_form

    def __require_morph(self) -> pymorphy3.MorphAnalyzer:
        if self.__morph is None:
            raise RuntimeError("Normalizer MorphAnalyzer не загружен")

        return self.__morph

    def __require_stopwords(self) -> set[str]:
        if self.__stopwords is None:
            raise RuntimeError("Normalizer StopWords не загружены")

        return self.__stopwords
