# Generated by Django 5.1.2 on 2024-10-14 21:55

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0003_alter_modelscore_image_url'),
    ]

    operations = [
        migrations.AddField(
            model_name='modelscore',
            name='prompt',
            field=models.TextField(blank=True, default=None, null=True),
        ),
        migrations.AddField(
            model_name='modelscore',
            name='ref_image',
            field=models.URLField(blank=True, default=None, max_length=1000, null=True),
        ),
    ]
