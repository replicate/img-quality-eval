from django.urls import path
from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("data-form/", views.data_form, name="data_form"),
    path("submit-evaluation/", views.submit_evaluation, name="submit_evaluation"),
    path(
        "generate-and-evaluate",
        views.generate_and_evaluate,
        name="generate_and_evaluate",
    ),
    path("results/<str:eval_id>/", views.results, name="results"),
    path("api/results/<str:eval_id>/", views.api_results, name="api_results"),
]
