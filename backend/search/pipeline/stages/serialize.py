from datasets.models import PostVector

from ..schemas import SearchResultItem


class SerializeStage:
    @staticmethod
    def serialize(candidate: PostVector, similarity: float | None) -> SearchResultItem:
        return SearchResultItem(
            id=candidate.post_id,
            source=candidate.post.source.name,
            source_base_url=candidate.post.source.base_url,
            title=candidate.post.title,
            description=candidate.post.description,
            url=candidate.post.url,
            price=candidate.post.price,
            price_currency=candidate.post.price_currency,
            published_at=candidate.published_at,
            collected_at=candidate.post.collected_at,
            is_deleted=candidate.post.is_deleted,
            cleaned_text=candidate.cleaned_text,
            similarity=round(similarity, 4) if similarity is not None else None,
        )
