from __future__ import annotations

import os

from openai import OpenAI


class OpenAIProvider:
    def __init__(self) -> None:
        api_key = os.getenv("OPENAI_API_KEY")
        model = os.getenv("OPENAI_MODEL")
        if not api_key or not model:
            raise RuntimeError("OPENAI_API_KEY and OPENAI_MODEL must be configured.")
        self._client = OpenAI(api_key=api_key)
        self._model = model

    def generate(self, *, instructions: str, input_text: str) -> str:
        response = self._client.responses.create(model=self._model, instructions=instructions, input=input_text)
        if not response.output_text:
            raise RuntimeError("OpenAI returned no text output.")
        return response.output_text
