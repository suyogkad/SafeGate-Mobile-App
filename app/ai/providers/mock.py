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

        last_msg = ""
        for m in reversed(messages):
            if m.get("role") in ("user", "child"):
                last_msg = m.get("content", "").lower().strip()
                break

        if any(w in last_msg for w in ["hi", "hello", "hey"]):
            return "Hi there! It's so nice to talk with you today. What's on your mind?"
        if any(w in last_msg for w in ["draw", "art", "paint", "color"]):
            return "Drawing is lots of fun! What are you drawing or coloring today?"
        if any(w in last_msg for w in ["lego", "build", "block", "toy", "game"]):
            return "That sounds really creative! Tell me what you're making or playing."
        if any(w in last_msg for w in ["joke", "funny"]):
            return "Why did the teddy bear say no to dessert? Because she was already stuffed! 🧸 Want another one?"
        if any(w in last_msg for w in ["happy", "good", "great", "yay"]):
            return "I'm so glad to hear that! What made your day so good?"
        if any(w in last_msg for w in ["sad", "mad", "angry", "upset", "tired"]):
            return "Thanks for letting me know how you feel. It is okay to feel that way. I'm right here with you."
        if any(w in last_msg for w in ["homework", "school", "math", "reading"]):
            return "School tasks can feel big sometimes. Taking it one tiny step at a time helps!"

        return "That sounds interesting! Tell me more about what you're thinking."

    async def transcribe(self, audio: bytes, filename: str, model: str) -> str:
        """Always "hears" the same sentence, so the Speak flow can be exercised
        without a microphone or a real provider."""
        return "I have homework and I don't know where to start"
