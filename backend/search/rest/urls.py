from django.urls import include, path

app_name = "search"

urlpatterns = [
    path("v1/search/", include("search.rest.v1.urls")),
]
