from django.urls import path

from .views import SearchView

app_name = "v1"

urlpatterns = [
    path("", SearchView.as_view(), name="search"),
]
