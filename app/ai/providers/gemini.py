"""The only file (besides mock.py and __init__.py's dispatch) allowed to import
the Google Gemini SDK, per CLAUDE.md's "one door to the AI" rule.
"""
from google.genai import Client
from google.genai.types import Content, GenerateContentConfig, Part

from app.config import get_settings


class GeminiProvider:
    async def generate(
        self,
        system_prompt: str,
        messages: list[dict[str, str]],
        model: str | None,
        max_tokens: int,
        json_mode: bool,
    ) -> str:
        settings = get_settings()
        client = Client(api_key=settings.google_api_key)

        contents = [
            Content(role="user" if m["role"] == "user" else "model", parts=[Part(text=m["content"])])
            for m in messages
        ]

        # Thinking stays enabled even for JSON-mode (classifier / reply-check)
        # calls: disabling it once caused stubborn false positives on
        # figurative language ("this homework is killing me") that thinking
        # correctly reasons through. Thinking tokens count against the same
        # max_output_tokens budget as the visible output, so callers must
        # pass a generous max_tokens or the response can be truncated to
        # nothing (observed with max_tokens=20).
        config = GenerateContentConfig(
            system_instruction=system_prompt,
            max_output_tokens=max_tokens,
            response_mime_type="application/json" if json_mode else "text/plain",
        )

        response = await client.aio.models.generate_content(
            model=model or settings.ai_companion_model,
            contents=contents,
            config=config,
        )
        return response.text

    async def transcribe(self, audio: bytes, filename: str, model: str) -> str:
        raise NotImplementedError("Speech-to-text is not implemented for the Gemini provider")
