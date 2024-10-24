# TODO:
# * aggregate predict_time and scores

import json
import hashlib
import random
import uuid
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.urls import reverse
from django.db.models import Prefetch
import pydantic
from .models import Evaluation, Row, Example, ModelScore
from .tasks import evaluate_chunk, generate_image
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
        hashed_api_key = hash_api_key(api_key)

        title = data.title

        input_data = data.data
        has_prompt = [bool(row.prompt) for row in input_data]
        if not all(has_prompt) and not all(not p for p in has_prompt):
            return JsonResponse(
                {"error": "All rows must either have a prompt or no prompt"}, status=400
            )

        eval_id = str(uuid.uuid4())
        evaluation = Evaluation.objects.create(
            eval_id=eval_id,
            title=title,
            enabled_models=data.eval_models,
            hashed_api_key=hashed_api_key,
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

        results_url = request.build_absolute_uri(reverse("results", args=[eval_id]))
        return JsonResponse({"evaluation_id": eval_id, "results_url": results_url})

    return JsonResponse({"error": "Invalid request method"}, status=405)


@csrf_exempt
def generate_and_evaluate(request):
    if request.method == "POST":
        try:
            data = GenerateAndEvaluateRequest.model_validate_json(request.body)
        except pydantic.ValidationError as e:
            return JsonResponse({"error": str(e)}, status=400)

        api_key = encrypt_key(data.api_key)
        hashed_api_key = hash_api_key(api_key)
        title = data.title

        eval_id = str(uuid.uuid4())
        evaluation = Evaluation.objects.create(
            eval_id=eval_id,
            title=title,
            enabled_models=data.eval_models,
            hashed_api_key=hashed_api_key,
        )

        for row_data in data.rows:
            seed = row_data.seed or random.randint(0, 1000000)
            prompt = row_data.prompt
            row = Row.objects.create(evaluation=evaluation, prompt=prompt, seed=seed)

            for example_data in row_data.examples:
                labels = {k: v for k, v in example_data.inputs.items()}  # clone
                example = Example.objects.create(
                    row=row, labels=labels, gen_model=example_data.model
                )

                inputs = example_data.inputs
                inputs[example_data.prompt_input] = row_data.prompt
                inputs[example_data.seed_input] = seed

                generate_image.delay(
                    api_key=api_key,
                    example_id=example.id,
                    model=example_data.model,
                    inputs=example_data.inputs,
                )

        results_url = request.build_absolute_uri(reverse("results", args=[eval_id]))
        return JsonResponse({"evaluation_id": eval_id, "results_url": results_url})

    return JsonResponse({"error": "Invalid request method"}, status=405)


def evaluations(request):
    if request.method == "GET":
        return render(request, "evaluations.html")


@csrf_exempt
def fetch_evaluations(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            api_key = data.get("api_key")
            if not api_key:
                return JsonResponse({"error": "API key is required"}, status=400)

            encrypted_key = encrypt_key(api_key)
            hashed_key = hash_api_key(encrypted_key)

            evaluations = []
            for evaluation in Evaluation.objects.filter(hashed_api_key=hashed_key).order_by("-created_at"):
                eval_data = {
                    "eval_id": evaluation.eval_id,
                    "title": evaluation.title,
                    "enabled_models": evaluation.enabled_models,
                    "created_at": evaluation.created_at,
                    "num_rows": Row.objects.filter(evaluation=evaluation).count()
                }
                evaluations.append(eval_data)

            return JsonResponse({"evaluations": list(evaluations)})

        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON"}, status=400)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    return JsonResponse({"error": "Method not allowed"}, status=405)


def results(request, eval_id):
    evaluation = Evaluation.objects.get(eval_id=eval_id)
    return render(
        request, "results.html", {"eval_id": eval_id, "title": evaluation.title}
    )


def api_results(request, eval_id):
    evaluation = get_object_or_404(Evaluation, eval_id=eval_id)

    rows = (
        Row.objects.filter(evaluation=evaluation)
        .order_by("id")
        .prefetch_related(
            Prefetch(
                "examples",
                queryset=Example.objects.order_by("id"),
                to_attr="ordered_examples",
            )
        )
    )

    # Fetch all ModelScores for this evaluation in one query
    model_scores = ModelScore.objects.filter(evaluation=evaluation)

    # Create a dictionary for fast lookup
    score_lookup = {}
    for score in model_scores:
        score_lookup.setdefault(score.image_url, {})[score.model] = score

    results = {
        "rows": [],
        "enabled_models": evaluation.enabled_models,
        "completed": True,
        "title": evaluation.title,
    }

    for row in rows:
        row_data = {"prompt": row.prompt, "seed": row.seed, "images": []}

        for index, example in enumerate(row.ordered_examples):
            if not example.image_url:
                results["completed"] = False

            image_data = {
                "url": example.image_url,
                "labels": example.labels,
                "scores": {},
                "gen_prediction_id": example.gen_prediction_id,
                "gen_model": example.gen_model,
            }

            for model in evaluation.enabled_models:
                score = score_lookup.get(example.image_url, {}).get(model)
                if score:
                    if model == "DreamSim" and index > 0:
                        if score.ref_image == row.ordered_examples[0].image_url:
                            image_data["scores"][model] = score.score
                        else:
                            image_data["scores"][model] = None
                            results["completed"] = False
                    else:
                        image_data["scores"][model] = score.score
                else:
                    image_data["scores"][model] = None
                    if model != "DreamSim" or index > 0:
                        results["completed"] = False

            row_data["images"].append(image_data)

        results["rows"].append(row_data)

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


def hash_api_key(api_key):
    return hashlib.sha256(api_key.encode()).hexdigest()
