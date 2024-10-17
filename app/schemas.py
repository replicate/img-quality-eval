from pydantic import BaseModel, Field, ConfigDict


class Example(BaseModel):
    model_config = ConfigDict(extra="forbid")

    model: str
    prompt_input: str = "prompt"
    seed_input: str = "seed"
    inputs: dict[str, str | int | float | bool]


class Row(BaseModel):
    model_config = ConfigDict(extra="forbid")

    prompt: str
    seed: int | None = None
    examples: list[Example]


class GenerateAndEvaluateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    api_key: str
    title: str
    rows: list[Row]
    eval_models: list[str]


class ImageData(BaseModel):
    model_config = ConfigDict(extra="forbid")

    url: str
    labels: dict[str, str | int | float | bool] | None = None


class RowData(BaseModel):
    model_config = ConfigDict(extra="forbid")

    prompt: str | None = None
    images: list[ImageData] = Field(min_length=1)
    metadata: dict[str, str | int | float | bool] | None = None
