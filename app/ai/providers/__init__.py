"""The one door to the AI: every AI call in this app goes through generate().
Only files inside this package may import the Gemini SDK.
"""
from app.ai.providers.gemini import GeminiProvider
from app.ai.providers.mock import MockProvider
from app.config import get_settings


async def generate(
    system: str,
    messages: list[dict[str, str]],
    model: str | None = None,
    max_tokens: int = 300,
    json_mode: bool = False,
) -> str:
    settings = get_settings()
    provider = GeminiProvider() if settings.ai_provider == "gemini" else MockProvider()
    return await provider.generate(
        system_prompt=system, messages=messages, model=model, max_tokens=max_tokens, json_mode=json_mode
    )
