from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('submit/', views.submit_evaluation, name='submit_evaluation'),
    path('results/<str:eval_id>/', views.results, name='results'),
    path('api/results/<str:eval_id>/', views.api_results, name='api_results'),
]
