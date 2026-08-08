from __future__ import annotations

import os
import json

from groq import Groq


class GroqProvider:
    def __init__(self) -> None:
        api_key = os.getenv("GROQ_API_KEY")
        model = os.getenv("GROQ_MODEL")
        if not api_key or not model:
            raise RuntimeError("GROQ_API_KEY and GROQ_MODEL must be configured.")
        self._client = Groq(api_key=api_key)
        self._model = model

    def generate(self, *, instructions: str, input_text: str) -> str:
        return self._completion(instructions, input_text).choices[0].message.content or ""

    def generate_json(self, *, instructions: str, input_text: str, schema: dict) -> str:
        completion = self._client.chat.completions.create(
            model=self._model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        f"{instructions}\n\nReturn one JSON object that validates "
                        f"against this schema: {json.dumps(schema)}"
                    ),
                },
                {"role": "user", "content": input_text},
            ],
            response_format={"type": "json_object"},
        )
        content = completion.choices[0].message.content
        if not content:
            raise RuntimeError("Groq returned no structured output.")
        return content

    def _completion(self, instructions: str, input_text: str):
        return self._client.chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": instructions},
                {"role": "user", "content": input_text},
            ],
        )
