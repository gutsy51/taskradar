from datetime import datetime, time

from django.db.models import Q, QuerySet

from datasets.models import PostVector

from ..schemas import SearchParams


class FilterStage:
    @staticmethod
    def apply(params: SearchParams) -> QuerySet[PostVector]:
        queryset = PostVector.objects.select_related("post", "post__source").filter(
            post__is_deleted=params.is_deleted
        )

        if params.published_at.from_date is not None:
            queryset = queryset.filter(
                published_at__gte=datetime.combine(params.published_at.from_date, time.min)
            )

        if params.published_at.to_date is not None:
            queryset = queryset.filter(
                published_at__lte=datetime.combine(params.published_at.to_date, time.max)
            )

        if params.collected_at.from_date is not None:
            queryset = queryset.filter(
                post__collected_at__gte=datetime.combine(params.collected_at.from_date, time.min)
            )

        if params.collected_at.to_date is not None:
            queryset = queryset.filter(
                post__collected_at__lte=datetime.combine(params.collected_at.to_date, time.max)
            )

        if params.source:
            numeric_source_ids = [int(source) for source in params.source if source.isdigit()]
            named_sources = [source for source in params.source if not source.isdigit()]

            source_filter = Q()
            if numeric_source_ids:
                source_filter |= Q(post__source_id__in=numeric_source_ids)
            if named_sources:
                source_filter |= Q(post__source__name__in=named_sources)

            queryset = queryset.filter(source_filter)

        if params.price.is_specified is True:
            queryset = queryset.filter(post__price__gt=0)
        elif params.price.is_specified is False:
            queryset = queryset.filter(Q(post__price__isnull=True) | Q(post__price__lte=0))

        if params.price.currency:
            queryset = queryset.filter(post__price_currency__in=params.price.currency)

        if params.price.min_amount is not None:
            queryset = queryset.filter(post__price__gte=params.price.min_amount)

        if params.price.max_amount is not None:
            queryset = queryset.filter(post__price__lte=params.price.max_amount)

        return queryset
