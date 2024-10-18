from django.urls import path
from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("data-form/", views.data_form, name="data_form"),
    path("api/evaluate-images", views.evaluate_images, name="evaluate_images"),
    path(
        "api/generate-and-evaluate",
        views.generate_and_evaluate,
        name="generate_and_evaluate",
    ),
    path("results/<str:eval_id>/", views.results, name="results"),
    path("api/results/<str:eval_id>/", views.api_results, name="api_results"),
    path("api-docs/", views.api_docs, name="api_docs"),
]
