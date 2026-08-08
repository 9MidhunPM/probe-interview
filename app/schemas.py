from __future__ import annotations

from typing import Any

from pydantic import BaseModel


def strict_json_schema(model: type[BaseModel]) -> dict[str, Any]:
    schema = model.model_json_schema()
    _forbid_extra_properties(schema)
    return schema


def _forbid_extra_properties(value: Any) -> None:
    if isinstance(value, dict):
        if value.get("type") == "object" or "properties" in value:
            value["additionalProperties"] = False
        for nested in value.values():
            _forbid_extra_properties(nested)
    elif isinstance(value, list):
        for nested in value:
            _forbid_extra_properties(nested)
