# TODO:
# * seed input
# * aggregate predict_time and scores
# * don't show DreamSim on first output

import random
import uuid
import json
from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.urls import reverse
import pydantic
from .models import Evaluation, Row, Example, ModelScore
from .tasks import evaluate_chunk, generate_image
from .data import load_input_data
from .encryption import encrypt_key
from .schemas import GenerateAndEvaluateRequest, EvaluateImagesRequest

CHUNK_SIZE = 100


def index(request):
    return render(request, "index.html")


def data_form(request):
    return render(request, "data_form.html")


@csrf_exempt
def evaluate_images(request):
    if request.method == "POST":
        try:
            data = EvaluateImagesRequest.model_validate_json(request.body)
        except pydantic.ValidationError as e:
            return JsonResponse({"error": str(e)}, status=400)

        api_key = encrypt_key(data.api_key)
        title = data.title

        input_data = data.data
        has_prompt = [bool(row.prompt) for row in input_data]
        if not all(has_prompt) and not all(not p for p in has_prompt):
            return JsonResponse({"error": "All rows must either have a prompt or no prompt"}, status=400)

        eval_id = str(uuid.uuid4())
        evaluation = Evaluation.objects.create(
            eval_id=eval_id,
            title=title,
            enabled_models=data.eval_models,
        )

        row_ids = []
        for row_data in input_data:
            seed = row_data.seed or random.randint(0, 1000000)
            row = Row.objects.create(
                evaluation=evaluation, prompt=row_data.prompt, seed=seed
            )
            for image_data in row_data.images:
                Example.objects.create(
                    row=row,
                    image_url=image_data.url,
                    labels=image_data.labels,
                )
            row_ids.append(row.id)

        for i in range(0, len(row_ids), CHUNK_SIZE):
            chunk = row_ids[i : i + CHUNK_SIZE]
            evaluate_chunk.delay(api_key, eval_id, chunk)

        results_url = request.build_absolute_uri(reverse('results', args=[eval_id]))
        return JsonResponse({
            "evaluation_id": eval_id,
            "results_url": results_url
        })

    return JsonResponse({"error": "Invalid request method"}, status=405)


@csrf_exempt
def generate_and_evaluate(request):
    if request.method == "POST":
        try:
            data = GenerateAndEvaluateRequest.model_validate_json(request.body)
        except pydantic.ValidationError as e:
            return JsonResponse({"error": str(e)}, status=400)

        api_key = encrypt_key(data.api_key)
        title = data.title

        eval_id = str(uuid.uuid4())
        evaluation = Evaluation.objects.create(
            eval_id=eval_id,
            title=title,
            enabled_models=data.eval_models,
        )

        for row_data in data.rows:
            seed = row_data.seed or random.randint(0, 1000000)
            prompt = row_data.prompt
            row = Row.objects.create(evaluation=evaluation, prompt=prompt, seed=seed)

            for example_data in row_data.examples:
                labels = {"model": example_data.model}
                labels |= example_data.inputs
                example = Example.objects.create(row=row, labels=labels)

                inputs = example_data.inputs
                inputs[example_data.prompt_input] = row_data.prompt
                inputs[example_data.seed_input] = seed

                generate_image.delay(
                    api_key=api_key,
                    example_id=example.id,
                    model=example_data.model,
                    inputs=example_data.inputs,
                )

        results_url = request.build_absolute_uri(reverse('results', args=[eval_id]))
        return JsonResponse({
            "evaluation_id": eval_id,
            "results_url": results_url
        })

    return JsonResponse({"error": "Invalid request method"}, status=405)


def results(request, eval_id):
    evaluation = Evaluation.objects.get(eval_id=eval_id)
    return render(
        request, "results.html", {"eval_id": eval_id, "title": evaluation.title}
    )


def api_results(request, eval_id):
    evaluation = get_object_or_404(Evaluation, eval_id=eval_id)
    rows = Row.objects.filter(evaluation=evaluation).prefetch_related("examples")

    results = {
        "data": [],
        "enabled_models": evaluation.enabled_models,
        "completed": True,
    }

    for row in rows:
        row_data = {"prompt": row.prompt, "seed": row.seed, "images": []}
        for index, example in enumerate(row.examples.all().order_by("id")):
            image_data = {
                "url": example.image_url,
                "labels": example.labels,
                "scores": {},
                "gen_prediction_id": example.gen_prediction_id,
            }

            for model in evaluation.enabled_models:
                if model == "DreamSim" and index > 0:
                    ref_image = row.examples.first().image_url
                    score = ModelScore.objects.filter(
                        evaluation=evaluation,
                        image_url=example.image_url,
                        model=model,
                        ref_image=ref_image,
                    ).first()
                else:
                    score = ModelScore.objects.filter(
                        evaluation=evaluation,
                        image_url=example.image_url,
                        model=model,
                        prompt=row.prompt,
                    ).first()

                if score:
                    image_data["scores"][model] = score.score
                else:
                    image_data["scores"][model] = None
                    if model != "DreamSim" or index > 0:
                        results["completed"] = False

            row_data["images"].append(image_data)

        results["data"].append(row_data)

    return JsonResponse(results)


def api_docs(request):
    return render(request, "api_docs.html")


def get_prompts(prompt_dataset, custom_prompts):
    if prompt_dataset == "parti-prompts":
        # Load 1631 prompts from a file
        with open("path/to/parti-prompts.txt", "r") as f:
            return f.read().splitlines()
    elif prompt_dataset == "parti-prompts-tiny":
        # Load 10 prompts from a file
        with open("path/to/parti-prompts-tiny.txt", "r") as f:
            return f.read().splitlines()
    elif prompt_dataset == "custom":
        return custom_prompts.splitlines()
    else:
        raise ValueError("Invalid prompt dataset")
