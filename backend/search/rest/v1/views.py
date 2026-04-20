import json

from django.http import HttpRequest, JsonResponse
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from pydantic import ValidationError

from search.pipeline import SearchParams, SearchPipeline


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
