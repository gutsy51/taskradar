from datetime import timedelta

from django.db.models import Count, Max, Q
from django.http import HttpRequest, JsonResponse
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt


@method_decorator(csrf_exempt, name="dispatch")
class SourceStatsView(View):
    def get(self, request: HttpRequest) -> JsonResponse:
        from datasets.models import Source

        since_24h = timezone.now() - timedelta(hours=24)
        rows = (
            Source.objects
            .annotate(
                total=Count("posts", filter=Q(posts__is_deleted=False)),
                new_today=Count(
                    "posts",
                    filter=Q(posts__is_deleted=False, posts__published_at__gte=since_24h),
                ),
                last_collected=Max(
                    "posts__collected_at",
                    filter=Q(posts__is_deleted=False),
                ),
            )
            .filter(total__gt=0)
            .values("name", "total", "new_today", "last_collected")
        )
        result = [
            {
                "source": r["name"],
                "total": r["total"],
                "new_today": r["new_today"],
                "last_parsed": (
                    r["last_collected"].strftime("%Y-%m-%d %H:%M:%S")
                    if r["last_collected"]
                    else None
                ),
            }
            for r in rows
        ]
        return JsonResponse(result, safe=False)
