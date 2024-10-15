from celery import shared_task
import replicate
from .models import Evaluation, ModelScore
from celery.result import AsyncResult


@shared_task
def process_evaluation_chunk(eval_id, api_key, chunk, chunk_index):
    evaluation = Evaluation.objects.get(eval_id=eval_id)
    models = evaluation.enabled_models

    # Set up the Replicate client with the API key
    client = replicate.Client(api_token=api_key)

    if "DreamSim" in models:
        dreamsim_prediction = process_dreamsim(client, chunk)
        check_prediction_status.delay(
            eval_id, api_key, dreamsim_prediction.id, "DreamSim", chunk_index
        )

    if set(models) & {"ImageReward", "Aesthetic", "CLIP", "BLIP", "PickScore"}:
        flash_eval_prediction = process_flash_eval(client, chunk, models)
        check_prediction_status.delay(
            eval_id, api_key, flash_eval_prediction.id, "FlashEval", chunk_index
        )


def process_dreamsim(client: replicate.Client, chunk):
    image_separator = "|||"
    dreamsim_version = client.models.get("andreasjansson/dreamsim").latest_version
    assert dreamsim_version

    input_images = []
    for row in chunk:
        images = [img["url"] for img in row["images"]]
        input_images.extend(images)

    input_images_str = image_separator.join(input_images)

    prediction = client.predictions.create(
        version=dreamsim_version.id,
        input={"images": input_images_str, "separator": image_separator},
    )

    print(f"Running dreamsim prediction https://replicate.com/p/{prediction.id}")

    return prediction


def process_flash_eval(client, chunk, models):
    prompt_images_separator = ":::"
    image_separator = "|||"

    # TODO: use latest version
    flash_eval_version = client.models.get("andreasjansson/flash-eval").latest_version
    assert flash_eval_version

    prompts_and_images = []
    for row in chunk:
        prompt = row.get("prompt", "")
        images = [img["url"] for img in row["images"]]
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
def check_prediction_status(eval_id, api_key, prediction_id, model_type, chunk_index):
    client = replicate.Client(api_token=api_key)
    prediction = client.predictions.get(prediction_id)

    if prediction.status == "succeeded":
        process_prediction_output(eval_id, prediction, model_type, chunk_index)
    elif prediction.status in ["failed", "canceled"]:
        print(f"{model_type} prediction failed or was canceled for chunk {chunk_index}")
    else:
        # Re-queue the task to check again later
        check_prediction_status.apply_async(
            args=[eval_id, api_key, prediction_id, model_type, chunk_index],
            countdown=10,  # Wait 10 seconds before checking again
        )


def process_prediction_output(eval_id, prediction, model_type, chunk_index):
    evaluation = Evaluation.objects.get(eval_id=eval_id)
    output = prediction.output

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

    print(f"Processed {model_type} results for chunk {chunk_index}")
