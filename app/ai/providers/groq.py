"""Groq-backed provider (api.groq.com), one of the two real doors to the AI.

Groq serves open models (the gpt-oss family here) behind an OpenAI-compatible
chat-completions API, so this talks to it with plain httpx rather than pulling in
another SDK.

Note on the name: this is **Groq** (groq.com, keys begin `gsk_`), not **Grok**
(x.ai, keys begin `xai-`). They are different companies that sound identical.
Switching to xAI later is a base-URL and key change, nothing more, because both
speak the same OpenAI-compatible shape.

The classifier and reply-check run at temperature 0: a safety decision should not
vary between identical messages.
"""
import httpx

from app.config import get_settings

_API = "https://api.groq.com/openai/v1/chat/completions"
_TRANSCRIBE_API = "https://api.groq.com/openai/v1/audio/transcriptions"
_TIMEOUT = 30.0


class GroqProvider:
    async def generate(
        self,
        system_prompt: str,
        messages: list[dict[str, str]],
        model: str | None,
        max_tokens: int,
        json_mode: bool,
    ) -> str:
        settings = get_settings()

        body: dict = {
            "model": model or settings.ai_companion_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                *(
                    {"role": "user" if m["role"] == "user" else "assistant", "content": m["content"]}
                    for m in messages
                ),
            ],
            # The gpt-oss models reason before answering and those tokens come out of
            # this budget, so callers pass a generous figure (a classifier reply of
            # ~20 characters still costs around 200 tokens).
            "max_completion_tokens": max_tokens,
        }
        if json_mode:
            body["response_format"] = {"type": "json_object"}
            body["temperature"] = 0

        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            # The key goes in a header and is never logged.
            response = await client.post(
                _API, headers={"Authorization": f"Bearer {settings.groq_api_key}"}, json=body
            )
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]

    async def transcribe(self, audio: bytes, filename: str, model: str) -> str:
        """Turn a recording into text. The audio is forwarded and then dropped --
        it is never written to disk or to the database (CLAUDE.md: collect the
        minimum child data needed)."""
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            response = await client.post(
                _TRANSCRIBE_API,
                headers={"Authorization": f"Bearer {get_settings().groq_api_key}"},
                files={"file": (filename, audio)},
                data={"model": model, "language": "en", "response_format": "json"},
            )
            response.raise_for_status()
            return response.json().get("text", "").strip()
