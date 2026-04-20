import logging

import numpy as np
from django.db import connection, transaction
from django.db.models import Case, FloatField, IntegerField, QuerySet, Value, When
from numpy.typing import NDArray
from pgvector.django import CosineDistance

from datasets.models import PostVector

from ..schemas import SearchParams, SearchSort

logger = logging.getLogger(__name__)


class SemanticStage:
    __BASE_CANDIDATE_LIMIT = 400
    __FRESHNESS_CANDIDATE_LIMIT = 1500
    __MAX_CANDIDATE_LIMIT = 5000
    __MAX_EF_SEARCH = 10000

    @classmethod
    def apply(
        cls,
        queryset: QuerySet[PostVector],
        query_vector: NDArray[np.float32] | None,
        params: SearchParams,
    ) -> QuerySet[PostVector]:
        if query_vector is None:
            return queryset.order_by("-published_at", "-id")

        candidate_rows = cls.__fetch_candidates(queryset, query_vector, params)
        ranked_candidates = cls.__filter_candidates(candidate_rows, params)

        if not ranked_candidates:
            return queryset.none()

        return cls.__rerank_candidates(queryset, ranked_candidates, params)

    @classmethod
    def __fetch_candidates(
        cls,
        queryset: QuerySet[PostVector],
        query_vector: NDArray[np.float32],
        params: SearchParams,
    ) -> list[tuple[int, float]]:
        candidate_limit = cls.__resolve_candidate_limit(params)
        ef_search = cls.__resolve_ef_search(candidate_limit, params)

        candidate_queryset = (
            queryset.filter(vector__isnull=False)
            .annotate(distance=CosineDistance("vector", query_vector.tolist()))
            .order_by("distance")
        )

        with transaction.atomic():
            cls.__set_hnsw_ef_search(ef_search)

            return list(candidate_queryset.values_list("id", "distance")[:candidate_limit])

    @staticmethod
    def __filter_candidates(
        candidate_rows: list[tuple[int, float]],
        params: SearchParams,
    ) -> list[tuple[int, float, float, int]]:
        ranked_candidates: list[tuple[int, float, float, int]] = []

        for candidate_rank, (candidate_id, distance) in enumerate(candidate_rows):
            similarity = 1.0 - float(distance)

            if similarity < params.similarity_threshold:
                continue

            ranked_candidates.append(
                (
                    int(candidate_id),
                    float(distance),
                    similarity,
                    candidate_rank,
                )
            )

        return ranked_candidates

    @classmethod
    def __rerank_candidates(
        cls,
        queryset: QuerySet[PostVector],
        ranked_candidates: list[tuple[int, float, float, int]],
        params: SearchParams,
    ) -> QuerySet[PostVector]:
        candidate_ids = [candidate_id for candidate_id, _, _, _ in ranked_candidates]
        similarity_annotation = Case(
            *[
                When(id=candidate_id, then=Value(similarity))
                for candidate_id, _, similarity, _ in ranked_candidates
            ],
            output_field=FloatField(),
        )
        distance_annotation = Case(
            *[
                When(id=candidate_id, then=Value(distance))
                for candidate_id, distance, _, _ in ranked_candidates
            ],
            output_field=FloatField(),
        )
        candidate_rank_annotation = Case(
            *[
                When(id=candidate_id, then=Value(candidate_rank))
                for candidate_id, _, _, candidate_rank in ranked_candidates
            ],
            output_field=IntegerField(),
        )

        reranked_queryset = queryset.filter(id__in=candidate_ids).annotate(
            similarity=similarity_annotation,
            distance=distance_annotation,
            candidate_rank=candidate_rank_annotation,
        )

        if params.sort == SearchSort.FRESHNESS:
            return reranked_queryset.order_by(
                "-published_at", "-similarity", "candidate_rank", "-id"
            )

        return reranked_queryset.order_by("-similarity", "-published_at", "candidate_rank", "-id")

    @classmethod
    def __resolve_candidate_limit(cls, params: SearchParams) -> int:
        page_window = max(params.offset + params.limit, params.limit)
        candidate_limit = max(page_window * 8, cls.__BASE_CANDIDATE_LIMIT)

        if params.sort == SearchSort.FRESHNESS:
            candidate_limit = max(
                candidate_limit, page_window * 20, cls.__FRESHNESS_CANDIDATE_LIMIT
            )

        if params.has_keywords:
            candidate_limit *= 2

        return min(candidate_limit, cls.__MAX_CANDIDATE_LIMIT)

    @classmethod
    def __resolve_ef_search(cls, candidate_limit: int, params: SearchParams) -> int:
        ef_search = max(candidate_limit * 2, 200)

        if params.sort == SearchSort.FRESHNESS:
            ef_search = max(ef_search, 3000)

        if params.has_keywords:
            ef_search *= 2

        return min(ef_search, cls.__MAX_EF_SEARCH)

    @staticmethod
    def __set_hnsw_ef_search(ef_search: int) -> None:
        with connection.cursor() as cursor:
            try:
                cursor.execute("SET LOCAL hnsw.ef_search = %s", [ef_search])
            except Exception as exc:
                logger.debug("Не удалось задать hnsw.ef_search: %s", exc)
