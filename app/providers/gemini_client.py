from __future__ import annotations

import os

from google import genai
from google.genai import types


class GeminiProvider:
    def __init__(self) -> None:
        api_key = os.getenv("GEMINI_API_KEY")
        model = os.getenv("GEMINI_MODEL")
        if not api_key or not model:
            raise RuntimeError("GEMINI_API_KEY and GEMINI_MODEL must be configured.")
        self._client = genai.Client(api_key=api_key)
        self._model = model

    def generate(self, *, instructions: str, input_text: str, max_tokens: int) -> str:
        response = self._client.models.generate_content(
            model=self._model,
            contents=input_text,
            config=types.GenerateContentConfig(
                system_instruction=instructions,
                max_output_tokens=max_tokens,
            ),
        )
        if not response.text:
            raise RuntimeError("Gemini returned no text output.")
        return response.text

    def generate_json(
        self, *, instructions: str, input_text: str, schema: dict, max_tokens: int
    ) -> str:
        response = self._client.models.generate_content(
            model=self._model,
            contents=input_text,
            config=types.GenerateContentConfig(
                system_instruction=instructions,
                response_mime_type="application/json",
                response_json_schema=schema,
                max_output_tokens=max_tokens,
            ),
        )
        if not response.text:
            raise RuntimeError("Gemini returned no structured output.")
        return response.text
