"""Email/SMS sending abstraction. Only a mock implementation exists so far;
a real provider (e.g. an email API, an SMS gateway) plugs in behind this
interface later without callers changing.
"""
from abc import ABC, abstractmethod


class NotificationSender(ABC):
    @abstractmethod
    async def send_email(self, to: str, subject: str, body: str) -> None: ...

    @abstractmethod
    async def send_sms(self, to: str, body: str) -> None: ...


class MockNotificationSender(NotificationSender):
    """Logs instead of sending. Never prints the message body, to avoid
    leaking child-related details to the console (see extras/CLAUDE.md privacy rules).
    """

    async def send_email(self, to: str, subject: str, body: str) -> None:
        print(f"[MOCK EMAIL] to={to} subject={subject!r}")

    async def send_sms(self, to: str, body: str) -> None:
        print(f"[MOCK SMS] to={to}")


def get_notification_sender() -> NotificationSender:
    return MockNotificationSender()
