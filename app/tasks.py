from typing import cast
from urllib.parse import urlparse
import os
from collections.abc import Iterator
from contextlib import contextmanager
import hashlib
import json
import tempfile
import boto3
import requests
from django.conf import settings
from celery import shared_task
import replicate
from .models import Evaluation, Row, Example, ModelScore
from .encryption import decrypt_key

s3 = boto3.client(
    "s3",
    endpoint_url=settings.AWS_ENDPOINT_URL_S3,
    region_name=settings.AWS_REGION,
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
)



print(f"access_key: {settings.AWS_ACCESS_KEY_ID}")
print(f"secret: {settings.AWS_SECRET_ACCESS_KEY}")


@shared_task
def evaluate_chunk(api_key, eval_id, row_ids):
    evaluation = Evaluation.objects.get(eval_id=eval_id)
    models = evaluation.enabled_models
    rows = Row.objects.filter(id__in=row_ids).prefetch_related("examples")

    client = replicate.Client(api_token=decrypt_key(api_key))

    if "DreamSim" in models:
        dreamsim_prediction = dreamsim_create_prediction(client, rows)
        poll_eval_prediction.delay(api_key, eval_id, dreamsim_prediction.id, "DreamSim")

    if set(models) & {"ImageReward", "Aesthetic", "CLIP", "BLIP", "PickScore"}:
        flash_eval_prediction = flash_eval_create_prediction(client, rows, models)
        poll_eval_prediction.delay(
            api_key, eval_id, flash_eval_prediction.id, "FlashEval"
        )


@shared_task
def generate_image(api_key, example_id, model, inputs):
    client = replicate.Client(api_token=decrypt_key(api_key))
    example = Example.objects.get(id=example_id)

    model_owner, model_name = model.split("/")
    model_name, model_version = (
        model_name.split(":") if ":" in model_name else (model_name, None)
    )

    if model_version:
        version = client.models.get(f"{model_owner}/{model_name}").versions.get(
            model_version
        )
    else:
        version = client.models.get(f"{model_owner}/{model_name}").latest_version

    # Compute hash for caching
    input_hash = compute_input_hash(inputs)
    cache_key = f"{version.id}/{input_hash}"

    # Check if output is cached
    output_url, labels, prediction_id = get_cached_prediction(cache_key)
    if output_url:
        print(f"Found cached image at {output_url}")
        example.image_url = output_url
        example.labels = labels
        example.gen_prediction_id = prediction_id
        example.save()

        row = example.row
        if row_is_complete(row):
            eval_id = row.evaluation.eval_id
            evaluate_chunk.delay(api_key, eval_id, [row.id])

    else:
        print(f"Generating prediction with inputs {inputs}")
        prediction = client.predictions.create(version=version, input=inputs)
        example.gen_prediction_id = prediction.id
        example.save()
        poll_gen_prediction.apply_async(
            args=[api_key, example_id, prediction.id, model, cache_key],
            countdown=2,
        )


def compute_input_hash(inputs):
    sorted_inputs = sorted(inputs.items())
    input_str = json.dumps(sorted_inputs)
    return hashlib.sha256(input_str.encode()).hexdigest()


@shared_task
def poll_gen_prediction(api_key, example_id, prediction_id, model, cache_key):
    client = replicate.Client(api_token=decrypt_key(api_key))
    prediction = client.predictions.get(prediction_id)

    if prediction.status == "succeeded":
        handle_gen_output(api_key, example_id, prediction, model, cache_key)
    elif prediction.status in ["failed", "canceled"]:
        example = Example.objects.get(id=example_id)
        example.gen_prediction_failed = True
        example.save()
    else:
        poll_gen_prediction.apply_async(
            args=[api_key, example_id, prediction_id, model, cache_key],
            countdown=10,
        )


def get_file_extension(output):
    if isinstance(output, list):
        url = output[0]
    elif isinstance(output, str):
        url = output
    else:
        return "json"

    return url.split(".")[-1]


def cached_url(cache_key, file_extension):
    return (
        f"https://fly.storage.tigris.dev/img-quality-eval/{cache_key}.{file_extension}"
    )


def get_cached_prediction(cache_key: str) -> tuple[str | None, dict | None, str | None]:
    try:
        metadata_file = s3.get_object(
            Bucket="img-quality-eval", Key=f"{cache_key}.json"
        )
    except:
        return None, None, None

    metadata = json.loads(metadata_file["Body"].read())
    file_extension = metadata["file_extension"]
    output_url = cached_url(cache_key, file_extension)
    return output_url, metadata["labels"], metadata["prediction_id"]


def cache_prediction(
    cache_key: str, output_url: str, labels: dict, prediction_id, file_extension: str
) -> None:
    with download(output_url) as local_path:
        s3.upload_file(local_path, "img-quality-eval", f"{cache_key}.{file_extension}")

    metadata = {
        "labels": labels,
        "file_extension": file_extension,
        "prediction_id": prediction_id,
    }
    with tempfile.NamedTemporaryFile(mode="w", delete=False) as temp:
        json.dump(metadata, temp)
        temp.flush()
        s3.upload_file(temp.name, "img-quality-eval", f"{cache_key}.json")


def row_is_complete(row: Row):
    examples = row.examples.all()

    return all(
        example.image_url or example.gen_prediction_failed for example in examples
    )


def handle_gen_output(api_key, example_id, prediction, model, cache_key):
    output = prediction.output

    predict_time = prediction.metrics["predict_time"]

    # Save output to cache
    file_extension = get_file_extension(output)

    example = Example.objects.get(id=example_id)
    if isinstance(output, list):
        image_url = output[0]
    elif isinstance(output, str):
        image_url = output
    else:
        print(f"Unexpected output format for model {model}: {output}")
        return

    labels = example.labels
    labels["predict_time"] = predict_time
    cache_prediction(cache_key, image_url, labels, prediction.id, file_extension)

    example.image_url = cached_url(cache_key, file_extension)
    example.labels = labels
    example.save()

    row = example.row
    if row_is_complete(row):
        eval_id = row.evaluation.id
        evaluate_chunk.delay(api_key, eval_id, [row.id])


def dreamsim_create_prediction(client: replicate.Client, rows):
    image_separator = "|||"
    dreamsim_version = client.models.get("andreasjansson/dreamsim").latest_version
    assert dreamsim_version

    input_images = []
    for row in rows:
        images = [example.image_url for example in row.examples.all()]
        input_images.extend(images)

    input_images_str = image_separator.join(input_images)

    prediction = client.predictions.create(
        version=dreamsim_version.id,
        input={"images": input_images_str, "separator": image_separator},
    )

    print(f"Running dreamsim prediction https://replicate.com/p/{prediction.id}")

    return prediction


def flash_eval_create_prediction(client, rows, models):
    prompt_images_separator = ":::"
    image_separator = "|||"

    flash_eval_version = client.models.get("andreasjansson/flash-eval").latest_version
    assert flash_eval_version

    prompts_and_images = []
    for row in rows:
        prompt = row.prompt or ""
        images = [example.image_url for example in row.examples.all()]
        prompts_and_images.append(
            f"{prompt}{prompt_images_separator}{image_separator.join(images)}"
        )

    input_data = {
        "prompts_and_images": "\n".join(prompts_and_images),
        "models": ",".join([m for m in models if m != "DreamSim"]),
        "prompt_images_separator": prompt_images_separator,
        "image_separator": image_separator,
    }

    prediction = client.predictions.create(
        version=flash_eval_version.id, input=input_data
    )

    print(f"Running flash-eval prediction https://replicate.com/p/{prediction.id}")

    return prediction


@shared_task
def poll_eval_prediction(api_key, eval_id, prediction_id, model_type):
    client = replicate.Client(api_token=decrypt_key(api_key))
    prediction = client.predictions.get(prediction_id)
    evaluation = Evaluation.objects.get(eval_id=eval_id)

    if prediction.status == "succeeded":
        output = cast(list[dict], prediction.output)
        save_model_score(evaluation, output, model_type)
    elif prediction.status in ["failed", "canceled"]:
        print(f"{model_type} prediction failed or was canceled for chunk")
    else:
        # Re-queue the task to check again later
        poll_eval_prediction.apply_async(
            args=[api_key, eval_id, prediction_id, model_type],
            countdown=10,  # Wait 10 seconds before checking again
        )


def save_model_score(evaluation: Evaluation, output: list[dict], model_type: str):
    if model_type == "DreamSim":
        for record in output:
            for test_image, score in record["distances"].items():
                ModelScore.objects.create(
                    evaluation=evaluation,
                    image_url=test_image,
                    model="DreamSim",
                    score=score,
                    ref_image=record["reference"],
                )
    elif model_type == "FlashEval":
        for record in output:
            for image_url, model_scores in record["scores"].items():
                for model, score in model_scores.items():
                    ModelScore.objects.create(
                        evaluation=evaluation,
                        image_url=image_url,
                        model=model,
                        score=score,
                        prompt=record["prompt"],
                    )

    print(f"Processed {model_type} results for chunk")


@contextmanager
def download(url: str) -> Iterator[str]:
    with tempfile.NamedTemporaryFile(
        delete=False, suffix=get_url_extension(url)
    ) as temp_file:
        response = requests.get(url)
        response.raise_for_status()
        temp_file.write(response.content)

    try:
        yield temp_file.name
    finally:
        os.remove(temp_file.name)


def get_url_extension(url):
    path = urlparse(url).path
    return os.path.splitext(path)[1]
