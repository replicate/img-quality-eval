from django.db import models
from django.contrib.postgres.fields import ArrayField


class Evaluation(models.Model):
    eval_id = models.CharField(max_length=36, unique=True)
    title = models.CharField(max_length=255)
    data = models.JSONField()
    enabled_models = ArrayField(models.CharField(max_length=50))
    created_at = models.DateTimeField(auto_now_add=True)


class ModelScore(models.Model):
    evaluation = models.ForeignKey(Evaluation, on_delete=models.CASCADE)
    image_url = models.URLField(max_length=1000)
    model = models.CharField(max_length=50)
    score = models.FloatField()
    ref_image = models.URLField(max_length=1000, default=None, blank=True, null=True)
    prompt = models.TextField(default=None, blank=True, null=True)
