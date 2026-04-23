import json

from django.contrib.auth import authenticate
from django.core import signing
from django.http import HttpRequest, JsonResponse
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from pydantic import ValidationError

from accounts.models import User
from search.pipeline import SearchParams, SearchPipeline

_TOKEN_MAX_AGE = 86400 * 30  # 30 дней


@method_decorator(csrf_exempt, name="dispatch")
class SearchView(View):
    http_method_names = ["get", "post"]

    def get(self, request: HttpRequest, *args: object, **kwargs: object) -> JsonResponse:
        return self.__handle_search(self.__build_get_payload(request))

    def post(self, request: HttpRequest, *args: object, **kwargs: object) -> JsonResponse:
        try:
            payload = self.__parse_json_body(request)
        except ValueError as exc:
            return JsonResponse({"ok": False, "errors": [{"msg": str(exc)}]}, status=400)

        return self.__handle_search(payload)

    @staticmethod
    def __handle_search(payload: dict[str, object]) -> JsonResponse:
        try:
            params = SearchParams.model_validate(payload)
        except ValidationError as exc:
            return JsonResponse({"ok": False, "errors": exc.errors()}, status=400)

        result = SearchPipeline.search(params)
        return JsonResponse({"ok": True, "data": result.model_dump(mode="json")})

    @staticmethod
    def __parse_json_body(request: HttpRequest) -> dict[str, object]:
        if not request.body:
            return {}

        try:
            payload = json.loads(request.body)
        except json.JSONDecodeError as e:
            raise ValueError("Не удалось разобрать JSON body") from e

        if not isinstance(payload, dict):
            raise ValueError("JSON body должен быть объектом")

        return payload

    @staticmethod
    def __build_get_payload(request: HttpRequest) -> dict[str, object]:
        return {
            "query": request.GET.get("query", ""),
            "keywords": request.GET.get("keywords", ""),
            "sort": request.GET.get("sort", "relevance"),
            "from_date": request.GET.get("from_date"),
            "to_date": request.GET.get("to_date"),
            "published_from": request.GET.get("published_from"),
            "published_to": request.GET.get("published_to"),
            "collected_from": request.GET.get("collected_from"),
            "collected_to": request.GET.get("collected_to"),
            "price_is_specified": request.GET.get("price_is_specified"),
            "price_currency": request.GET.getlist("price_currency")
            or request.GET.get("price_currency"),
            "price_min": request.GET.get("price_min"),
            "price_max": request.GET.get("price_max"),
            "source": request.GET.getlist("source") or request.GET.get("source"),
            "is_deleted": request.GET.get("is_deleted", False),
            "similarity_threshold": request.GET.get("similarity_threshold", 0.7),
            "limit": request.GET.get("limit", 20),
            "offset": request.GET.get("offset", 0),
        }


@method_decorator(csrf_exempt, name="dispatch")
class LoginView(View):
    def post(self, request: HttpRequest) -> JsonResponse:
        try:
            payload = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"detail": "Неверный JSON"}, status=400)

        username = payload.get("username", "").strip()
        password = payload.get("password", "")

        if not username or not password:
            return JsonResponse({"detail": "Логин и пароль обязательны"}, status=400)

        user = authenticate(request, username=username, password=password)
        if user is None:
            return JsonResponse({"detail": "Неверный логин или пароль"}, status=401)

        token = signing.dumps(user.pk)
        return JsonResponse({
            "access": token,
            "username": user.username,
            "email": user.email,
            "is_staff": user.is_staff,
        })


class MeView(View):
    def get(self, request: HttpRequest) -> JsonResponse:
        token = request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
        if not token:
            return JsonResponse({"detail": "Unauthorized"}, status=401)

        try:
            user_id = signing.loads(token, max_age=_TOKEN_MAX_AGE)
            user = User.objects.get(pk=user_id)
        except (signing.BadSignature, signing.SignatureExpired, User.DoesNotExist):
            return JsonResponse({"detail": "Недействительный токен"}, status=401)

        return JsonResponse({
            "id": user.pk,
            "username": user.username,
            "email": user.email,
            "is_staff": user.is_staff,
        })


class AnalyticsView(View):
    def get(self, request: HttpRequest) -> JsonResponse:
        from django.db.models import Avg, Count
        from django.db.models.functions import TruncDate

        from datasets.models import Post

        base_qs = Post.objects.filter(is_deleted=False)

        total = base_qs.count()
        with_price = base_qs.filter(price__gt=0).count()

        by_date = list(
            base_qs.filter(published_at__isnull=False)
            .annotate(date=TruncDate("published_at"))
            .values("date")
            .annotate(count=Count("id"))
            .order_by("date")
        )

        by_source = list(
            base_qs
            .values("source__name")
            .annotate(count=Count("id"), avg_price=Avg("price"))
            .order_by("-count")
        )

        return JsonResponse({
            "total": total,
            "with_price": with_price,
            "by_date": [
                {"date": str(item["date"]), "count": item["count"]}
                for item in by_date
            ],
            "by_source": [
                {
                    "source": item["source__name"],
                    "count": item["count"],
                    "avg_price": round(item["avg_price"]) if item["avg_price"] else None,
                }
                for item in by_source
            ],
        })


class TaskDetailView(View):
    def get(self, request: HttpRequest, task_id: int) -> JsonResponse:
        from datasets.models import Post
        from search.pipeline.stages import SerializeStage

        try:
            post = Post.objects.select_related("source").get(pk=task_id, is_deleted=False)
        except Post.DoesNotExist:
            return JsonResponse({"detail": "Не найдено"}, status=404)

        return JsonResponse(SerializeStage.serialize_post(post).model_dump(mode="json"))


class TaskSimilarView(View):
    def get(self, request: HttpRequest, task_id: int) -> JsonResponse:
        from datasets.models import PostVector
        from pgvector.django import CosineDistance
        from search.pipeline.stages import SerializeStage

        limit = min(int(request.GET.get("limit", 8)), 20)

        try:
            source_pv = PostVector.objects.get(post_id=task_id)
        except PostVector.DoesNotExist:
            return JsonResponse({"items": []})

        if source_pv.vector is None:
            return JsonResponse({"items": []})

        similar_qs = (
            PostVector.objects
            .select_related("post", "post__source")
            .filter(vector__isnull=False, post__is_deleted=False)
            .exclude(post_id=task_id)
            .annotate(distance=CosineDistance("vector", list(source_pv.vector)))
            .order_by("distance")[:limit]
        )

        items = [
            SerializeStage.serialize(pv, round(1.0 - float(pv.distance), 4)).model_dump(mode="json")
            for pv in similar_qs
        ]

        return JsonResponse({"items": items})
