"""Deterministic mock provider for local dev and tests (AI_PROVIDER=mock).

For JSON-mode calls, it returns a plausible default determined by which schema
key the system prompt describes ("risk" for the classifier, "safe" for the
reply check). It cannot approximate real judgment -- it always defaults to the
safe/benign outcome -- so this is good for plumbing tests only. Actual
risk-detection accuracy is only tested against the real provider (see the
marked, opt-in test in tests/test_companion_safety.py).
"""


class MockProvider:
    async def generate(
        self,
        system_prompt: str,
        messages: list[dict[str, str]],
        model: str | None,
        max_tokens: int,
        json_mode: bool,
    ) -> str:
        if json_mode:
            if '"risk"' in system_prompt:
                return '{"risk": "none"}'
            if '"safe"' in system_prompt:
                return '{"safe": true}'
            return "{}"

        return "I hear you. Let's take one slow breath together."
