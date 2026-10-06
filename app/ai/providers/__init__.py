"""The one door to the AI: every AI call in this app goes through generate().
Only files inside this package may import an AI SDK or call an AI endpoint.
"""
from app.ai.providers.gemini import GeminiProvider
from app.ai.providers.groq import GroqProvider
from app.ai.providers.mock import MockProvider
from app.config import get_settings

_PROVIDERS = {"groq": GroqProvider, "gemini": GeminiProvider}


async def generate(
    system: str,
    messages: list[dict[str, str]],
    model: str | None = None,
    max_tokens: int = 300,
    json_mode: bool = False,
) -> str:
    settings = get_settings()
    provider = _PROVIDERS.get(settings.ai_provider, MockProvider)()
    return await provider.generate(
        system_prompt=system, messages=messages, model=model, max_tokens=max_tokens, json_mode=json_mode
    )


async def transcribe(audio: bytes, filename: str, model: str | None = None) -> str:
    """Speech to text. Goes through the provider layer like every other AI call."""
    settings = get_settings()
    provider = _PROVIDERS.get(settings.ai_provider, MockProvider)()
    return await provider.transcribe(audio, filename, model or settings.ai_transcription_model)
