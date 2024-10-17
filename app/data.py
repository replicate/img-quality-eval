import json
from .schemas import RowData


def load_input_data(file_content: bytes) -> list[dict]:
    data = []
    for line in file_content.decode("utf-8").splitlines():
        if line.strip():  # Skip empty lines
            try:
                row = json.loads(line)
                validated_row = RowData.model_validate(row).model_dump()
                data.append(validated_row)
            except json.JSONDecodeError as e:
                raise ValueError(f"Invalid JSON in line: {line}") from e
            except ValueError as e:
                raise ValueError(
                    f"Validation error in line: {line}. Error: {str(e)}"
                ) from e

    # Additional validation: Check if all rows consistently have or don't have a prompt
    has_prompt = [bool(row["prompt"]) for row in data]
    if not all(has_prompt) and not all(not p for p in has_prompt):
        raise ValueError("All rows must either have a prompt or no prompt")

    return data
