from django.urls import path

from .sources_view import SourceStatsView
from .views import AnalyticsView, LoginView, MeView, SearchView, TaskDetailView, TaskSimilarView

app_name = "v1"

urlpatterns = [
    path("search/",                        SearchView.as_view(),      name="search"),
    path("sources/",                       SourceStatsView.as_view(), name="sources"),
    path("auth/login/",                    LoginView.as_view(),       name="login"),
    path("users/me/",                      MeView.as_view(),          name="me"),
    path("analytics/",                     AnalyticsView.as_view(),   name="analytics"),
    path("tasks/<int:task_id>/",           TaskDetailView.as_view(),  name="task-detail"),
    path("tasks/<int:task_id>/similar/",   TaskSimilarView.as_view(), name="task-similar"),
]
