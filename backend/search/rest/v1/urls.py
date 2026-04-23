from django.urls import path

from .sources_view import SourceStatsView
from .views import SearchView

app_name = "v1"

urlpatterns = [
    path("search/", SearchView.as_view(), name="search"),
    path("sources/", SourceStatsView.as_view(), name="sources"),
]
