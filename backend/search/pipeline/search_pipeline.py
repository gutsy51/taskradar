from django.db.models import QuerySet

from datasets.models import PostVector

from .keywords import KeywordMatcher
from .schemas import SearchParams, SearchResult
from .stages import BuildQueryStage, FilterStage, SemanticStage, SerializeStage


class SearchPipeline:
    __ITERATOR_CHUNK_SIZE = 200

    @classmethod
    def search(cls, params: SearchParams) -> SearchResult:
        query_vector = BuildQueryStage.build_query_embedding(params.query)

        if query_vector is None and not params.has_keywords:
            return cls.__browse(params)

        queryset = FilterStage.apply(params)
        queryset = SemanticStage.apply(queryset, query_vector, params)

        if params.has_keywords:
            total, paginated_items = cls.__paginate_with_keywords(queryset, params)
        else:
            total = queryset.count()
            paginated_items = list(queryset[params.offset : params.offset + params.limit])

        return SearchResult(
            total=total,
            limit=params.limit,
            offset=params.offset,
            sort=params.sort,
            query=params.query,
            applied_filters=cls.__build_applied_filters(params),
            items=[
                SerializeStage.serialize(candidate, getattr(candidate, "similarity", None))
                for candidate in paginated_items
            ],
        )

    @classmethod
    def __browse(cls, params: SearchParams) -> SearchResult:
        """Режим просмотра без поиска: напрямую из Post, без векторов."""
        queryset = FilterStage.apply_posts(params)
        total = queryset.count()
        paginated = list(queryset[params.offset : params.offset + params.limit])
        return SearchResult(
            total=total,
            limit=params.limit,
            offset=params.offset,
            sort=params.sort,
            query=params.query,
            applied_filters=cls.__build_applied_filters(params),
            items=[SerializeStage.serialize_post(post) for post in paginated],
        )

    @classmethod
    def __paginate_with_keywords(
        cls,
        queryset: QuerySet[PostVector],
        params: SearchParams,
    ) -> tuple[int, list[PostVector]]:
        matcher = KeywordMatcher(params.keywords)
        paginated_items: list[PostVector] = []
        total = 0
        end_offset = params.offset + params.limit

        for candidate in queryset.iterator(chunk_size=cls.__ITERATOR_CHUNK_SIZE):
            if not matcher.matches(cls.__build_keyword_text(candidate)):
                continue

            if params.offset <= total < end_offset:
                paginated_items.append(candidate)

            total += 1

        return total, paginated_items

    @staticmethod
    def __build_keyword_text(candidate: PostVector) -> str:
        parts: list[str] = []
        for value in (candidate.post.title, candidate.post.description, candidate.cleaned_text):
            normalized_value = value.strip()

            if normalized_value and normalized_value not in parts:
                parts.append(normalized_value)

        return " ".join(parts)

    @staticmethod
    def __build_applied_filters(params: SearchParams) -> dict[str, object]:
        return {
            "keywords": params.keywords or None,
            "published_at": params.published_at.model_dump(mode="json", by_alias=True),
            "collected_at": params.collected_at.model_dump(mode="json", by_alias=True),
            "price": params.price.model_dump(mode="json", by_alias=True),
            "source": params.source,
            "is_deleted": params.is_deleted,
            "similarity_threshold": params.similarity_threshold,
        }
