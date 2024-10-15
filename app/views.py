import uuid
from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Evaluation, ModelScore
from .tasks import process_evaluation_chunk, check_prediction_status
from .data import load_input_data

CHUNK_SIZE = 100


def index(request):
    return render(request, "index.html")


@csrf_exempt
def submit_evaluation(request):
    if request.method == "POST":
        api_key = request.POST.get("api_key")
        title = request.POST.get("title")
        data_file = request.FILES.get("data")
        models = request.POST.getlist("models")

        # Validate data
        try:
            data = load_input_data(data_file.read())
        except ValueError as e:
            print(e)
            return JsonResponse({"error": str(e)}, status=400)

        eval_id = str(uuid.uuid4())
        Evaluation.objects.create(
            eval_id=eval_id,
            title=title,
            data=data,
            enabled_models=models,
        )

        # Split data into chunks and kick off parallel jobs
        for i in range(0, len(data), CHUNK_SIZE):
            chunk = data[i : i + CHUNK_SIZE]
            process_evaluation_chunk.delay(eval_id, api_key, chunk, i // CHUNK_SIZE)

        return redirect("results", eval_id=eval_id)

    return JsonResponse({"error": "Invalid request method"}, status=405)


def results(request, eval_id):
    evaluation = Evaluation.objects.get(eval_id=eval_id)
    return render(
        request, "results.html", {"eval_id": eval_id, "title": evaluation.title}
    )


def api_results(request, eval_id):
    evaluation = Evaluation.objects.get(eval_id=eval_id)
    scores = ModelScore.objects.filter(evaluation=evaluation)

    score_dict = {}
    for score in scores:
        url = score.image_url
        if url not in score_dict:
            score_dict[url] = {}
        score_dict[url][score.model] = score.score

    results = {
        "data": evaluation.data,
        "enabled_models": evaluation.enabled_models,
        "scores": score_dict,
    }

    # Check if all scores have been computed
    completed = True
    for row in evaluation.data:
        for i, image in enumerate(row["images"]):
            for model in evaluation.enabled_models:
                if model == "DreamSim" and i == 0:
                    continue  # Skip the reference image for DreamSim
                if (
                    image["url"] not in score_dict
                    or model not in score_dict[image["url"]]
                ):
                    completed = False
                    break
            if not completed:
                break
        if not completed:
            break

    results["completed"] = completed

    return JsonResponse(results)
