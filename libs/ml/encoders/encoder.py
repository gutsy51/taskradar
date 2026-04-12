import logging
from functools import cached_property

import numpy as np
from numpy.typing import NDArray

from libs.utils import run_with_timer

from .e5base import E5Base, EncodeMode

logger = logging.getLogger(__name__)


class Encoder:
    """Singleton-интерфейс для работы с SentenceTransformer моделью E5Base.

    Загрузите модель с помощью load() перед использованием!
    """

    __instance = None
    __encoder: E5Base | None = None

    def __new__(cls) -> "Encoder":
        if cls.__instance is None:
            cls.__instance = super().__new__(cls)

        return cls.__instance

    @classmethod
    @run_with_timer(logger=logger, level=logging.DEBUG)
    def load(cls):
        if cls.__encoder is not None:
            logger.error("Encoder уже загружен")
            return

        cls.__encoder = E5Base()
        logger.info(f"Encoder загружен, модель {cls.__encoder.model_name}")

    @cached_property
    def model_name(self) -> str:
        return self.__require_encoder().model_name

    @run_with_timer(logger=logger, level=logging.DEBUG)
    def encode(
        self, texts: list[str], mode: EncodeMode = EncodeMode.DEFAULT
    ) -> NDArray[np.float32]:
        return self.__require_encoder().encode(texts, mode=mode)

    @run_with_timer(logger=logger, level=logging.DEBUG)
    def encode_one(
        self, text: str, mode: EncodeMode = EncodeMode.DEFAULT
    ) -> NDArray[np.float32]:
        return self.__require_encoder().encode_one(text, mode=mode)

    def __require_encoder(self) -> E5Base:
        if self.__encoder is None:
            raise RuntimeError("Encoder ещё не загружен")

        return self.__encoder
