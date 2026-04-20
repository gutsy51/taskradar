import logging

import numpy as np
from libs.ml.encoders import EncodeMode, Encoder
from numpy.typing import NDArray

logger = logging.getLogger(__name__)


class BuildQueryStage:
    _encoder = Encoder()

    @classmethod
    def build_query_embedding(cls, query: str) -> NDArray[np.float32] | None:
        if not query.strip():
            return None

        try:
            return cls._encoder.encode_one(query, mode=EncodeMode.QUERY)
        except RuntimeError:
            logger.info("Encoder is not loaded yet, loading on first search request")
            Encoder.load()
            return cls._encoder.encode_one(query, mode=EncodeMode.QUERY)
