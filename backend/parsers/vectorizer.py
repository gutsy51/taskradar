from sentence_transformers import SentenceTransformer

MODEL_NAME = 'paraphrase-multilingual-mpnet-base-v2'

_model: SentenceTransformer | None = None


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(MODEL_NAME)
    return _model


def build_cleaned_text(title: str, description: str) -> str:
    parts = [title.strip(), description.strip()]
    return '. '.join(p for p in parts if p)
