import logging
from enum import Enum
from pathlib import Path

import numpy as np
from numpy.typing import NDArray
from sentence_transformers import SentenceTransformer

from libs.ml.preprocessors import Preprocessor

logger = logging.getLogger(__name__)


class EncodeMode(str, Enum):
    DEFAULT = "default"
    QUERY = "query"
    PASSAGE = "passage"


class E5Base:
    """Sentence Transformer Multilingual-E5-Base.

    Загружает или скачивает модель. Использует Preprocessor перед векторизацией.
    Векторизует один текст или список текстов.
    """

    __MODEL_NAME: str = "intfloat/multilingual-e5-base"
    __MODEL_PATH: Path = Path(__file__).parent / "models_data" / "e5base"

    def __init__(self) -> None:
        self.__model: SentenceTransformer = self.__download_or_load_model()

    def __download_or_load_model(self) -> SentenceTransformer:
        if self.__MODEL_PATH.exists():
            logger.info(f"Модель {self.__MODEL_NAME} загружается из памяти")
            return SentenceTransformer(str(self.__MODEL_PATH))

        logger.info(f"Модель {self.__MODEL_NAME} загружается из HuggingFace")
        self.__model = SentenceTransformer(self.__MODEL_NAME)

        logger.info(f"Модель {self.__MODEL_NAME} сохраняется в память")
        self.__model.save(str(self.__MODEL_PATH))

        return self.__model

    @property
    def model_name(self) -> str:
        return self.__MODEL_NAME

    def encode(
        self, texts: list[str], mode: EncodeMode = EncodeMode.DEFAULT
    ) -> NDArray[np.float32]:
        mode = EncodeMode.PASSAGE if mode == EncodeMode.DEFAULT else mode
        texts = Preprocessor.preprocess(texts)

        emb_dim = self.__model.get_embedding_dimension()
        if emb_dim is None:
            raise RuntimeError(
                f"Модель {self.__MODEL_NAME} не содержит размерности векторов"
            )

        # Отделяем пустые тексты и векторизуем непустые.
        emb_array = np.zeros((len(texts), emb_dim), dtype=np.float32)
        non_empty_texts = [
            (i, f"{mode.value}: {t}") for i, t in enumerate(texts) if t.strip()
        ]

        if non_empty_texts:
            indices, clean_texts = zip(*non_empty_texts, strict=False)
            emb_array[list(indices)] = self.__model.encode(
                list(clean_texts),
                batch_size=128,
                show_progress_bar=False,
                normalize_embeddings=True,
                convert_to_numpy=True,
            ).astype(np.float32)

        return emb_array

    def encode_one(
        self, text: str, mode: EncodeMode = EncodeMode.DEFAULT
    ) -> NDArray[np.float32]:
        return self.encode([text], mode=mode)[0]
