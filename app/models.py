from django.db import models
from django.contrib.postgres.fields import ArrayField


class Evaluation(models.Model):
    eval_id = models.CharField(max_length=36, unique=True)
    title = models.CharField(max_length=255)
    enabled_models = ArrayField(models.CharField(max_length=50))
    created_at = models.DateTimeField(auto_now_add=True)


class Row(models.Model):
    evaluation = models.ForeignKey(
        Evaluation, on_delete=models.CASCADE, related_name="rows"
    )
    prompt = models.TextField(null=True, blank=True)


class Example(models.Model):
    row = models.ForeignKey(Row, on_delete=models.CASCADE, related_name="examples")
    image_url = models.URLField(max_length=1000, blank=True, null=True)
    labels = models.JSONField(default=dict)
    gen_prediction_id = models.CharField(max_length=100, blank=True, null=True)
    gen_prediction_failed = models.BooleanField(default=False)


class ModelScore(models.Model):
    evaluation = models.ForeignKey(Evaluation, on_delete=models.CASCADE)
    image_url = models.URLField(max_length=1000)
    model = models.CharField(max_length=50)
    score = models.FloatField()
    ref_image = models.URLField(max_length=1000, default=None, blank=True, null=True)
    prompt = models.TextField(default=None, blank=True, null=True)
