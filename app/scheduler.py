"""Shared APScheduler instance for time-based session reminders.

Uses the default in-memory job store: scheduled jobs do not survive an app
restart. Acceptable for the current MVP; a persistent job store (e.g.
SQLAlchemyJobStore) should be added before this runs unattended in production.
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()
