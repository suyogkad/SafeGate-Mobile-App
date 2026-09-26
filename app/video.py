"""Video room provider abstraction. The provider is chosen in the admin console
(System > Settings): "mock" for dev and tests, "daily" for Daily.co.

Rooms are private and short-lived. A room URL on its own is not enough to get in:
joining requires a per-participant meeting token, issued by `create_join_url` only
to the child's own parent or their assigned therapist (see routers/sessions.py).
Tokens carry the adult account holder's name, never the child's -- Daily is a third
party and sees the minimum needed to run the call.
"""
import uuid
from abc import ABC, abstractmethod
from datetime import datetime, timedelta

import httpx

from app.config import get_settings

# How long a room stays usable after the session's scheduled end, so a call that
# runs over isn't cut off mid-sentence.
ROOM_GRACE_MINUTES = 15
# How early a participant may join before the scheduled start.
JOIN_EARLY_MINUTES = 10

_HTTP_TIMEOUT = 10.0


def room_window(start_time: datetime, end_time: datetime) -> tuple[datetime, datetime]:
    """(earliest join, expiry) for a session, both UTC."""
    return (
        start_time - timedelta(minutes=JOIN_EARLY_MINUTES),
        end_time + timedelta(minutes=ROOM_GRACE_MINUTES),
    )


class VideoProvider(ABC):
    @abstractmethod
    def owns_url(self, url: str) -> bool:
        """True if `url` was issued by this provider. Lets a room created under a
        previous provider be recreated instead of silently failing to connect."""

    @abstractmethod
    async def create_room(self, session_id: uuid.UUID, expires_at: datetime) -> str:
        """Create (or reuse) a private room for a session and return its URL."""

    @abstractmethod
    async def create_join_url(self, room_url: str, display_name: str, is_host: bool, expires_at: datetime) -> str:
        """Return a URL that admits exactly one participant, valid for this session only.

        Deliberately no "not before" bound: the caller already refuses to mint a token
        outside the session's window, and a not-before derived from this server's clock
        silently locks legitimate participants out whenever that clock drifts ahead of
        the provider's.
        """


class MockVideoProvider(VideoProvider):
    _PREFIX = "https://mock-video.local/room/"

    def owns_url(self, url: str) -> bool:
        return url.startswith(self._PREFIX)

    async def create_room(self, session_id: uuid.UUID, expires_at: datetime) -> str:
        return f"{self._PREFIX}{session_id}"

    async def create_join_url(self, room_url: str, display_name: str, is_host: bool, expires_at: datetime) -> str:
        role = "host" if is_host else "guest"
        return f"{room_url}?t=mock-{role}-token&exp={int(expires_at.timestamp())}"


class DailyVideoProvider(VideoProvider):
    """Daily.co-backed implementation.

    Rooms are created with privacy="private" and an `exp`, and participants are
    ejected when it passes. Meeting tokens are minted per participant with `nbf`
    and `exp` bounded by the session's own window.
    """

    _API = "https://api.daily.co/v1"

    def __init__(self, api_key: str) -> None:
        self._api_key = api_key

    def owns_url(self, url: str) -> bool:
        return ".daily.co/" in url

    @staticmethod
    def _room_name(session_id: uuid.UUID) -> str:
        return f"session-{session_id}"

    def _client(self) -> httpx.AsyncClient:
        # The key goes in a header and is never logged: httpx errors quote the URL only.
        return httpx.AsyncClient(
            base_url=self._API,
            headers={"Authorization": f"Bearer {self._api_key}"},
            timeout=_HTTP_TIMEOUT,
        )

    async def create_room(self, session_id: uuid.UUID, expires_at: datetime) -> str:
        """Create the session's room, or update its expiry if it already exists
        (a retried booking, or a session moved to a new time)."""
        name = self._room_name(session_id)
        properties = {
            "exp": int(expires_at.timestamp()),
            "eject_at_room_exp": True,
            "enable_prejoin_ui": True,
        }
        async with self._client() as client:
            resp = await client.post("/rooms", json={"name": name, "privacy": "private", "properties": properties})
            if resp.status_code == 400:
                resp = await client.post(f"/rooms/{name}", json={"properties": properties})
            resp.raise_for_status()
            return resp.json()["url"]

    async def create_join_url(self, room_url: str, display_name: str, is_host: bool, expires_at: datetime) -> str:
        async with self._client() as client:
            resp = await client.post(
                "/meeting-tokens",
                json={
                    "properties": {
                        "room_name": room_url.rstrip("/").rsplit("/", 1)[-1],
                        "user_name": display_name,
                        "is_owner": is_host,
                        "exp": int(expires_at.timestamp()),
                    }
                },
            )
            resp.raise_for_status()
            return f"{room_url}?t={resp.json()['token']}"


def get_video_provider() -> VideoProvider:
    settings = get_settings()
    if settings.video_provider == "daily":
        return DailyVideoProvider(settings.daily_api_key)
    return MockVideoProvider()


async def ensure_room(session_obj, provider: VideoProvider | None = None) -> str:
    """Return a room URL belonging to the *current* provider, creating one if the
    session has none or still holds a URL from a previously configured provider."""
    provider = provider or get_video_provider()
    _, expires_at = room_window(session_obj.start_time, session_obj.end_time)
    if session_obj.video_room_url and provider.owns_url(session_obj.video_room_url):
        return session_obj.video_room_url
    return await provider.create_room(session_obj.id, expires_at)
