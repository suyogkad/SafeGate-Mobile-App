# Autism Support Platform -- Backend

A support and learning tool for autistic children: parents book online sessions with therapists, and children use a guided AI companion under a defence layer of safety checks. This is **not** a therapy, treatment, diagnostic, or emergency service -- see `CLAUDE.md` for the full set of non-negotiable safety and privacy rules this codebase follows.

This repo also contains two clients: `frontend/`, the admin web console (Vite + React + Tailwind, see `frontend/README.md`), and `mobile/`, the parent + therapist app with a supervised child mode (Expo / React Native, see `mobile/README.md`).

## Stack

- Python 3.12, FastAPI, Pydantic v2
- PostgreSQL, SQLAlchemy 2.0 (async), Alembic migrations
- Google Gemini SDK (`google-genai`) for the AI companion, behind a provider abstraction (`AI_PROVIDER=mock` by default)
- APScheduler for session reminders
- pytest for tests

## Local setup

### 1. Database

Local dev uses a **natively-installed PostgreSQL** (not Docker) on this machine, due to a conflict between Docker Desktop's Hyper-V requirement and this machine's onboard network adapter (see `CLAUDE.md`). `docker-compose.yml` is still provided for environments without that conflict (CI, a Linux host, etc).

Whichever way you run Postgres, create the app's database and role:

```sql
CREATE USER autism_user WITH PASSWORD 'changeme';
CREATE DATABASE autism_support OWNER autism_user;
GRANT ALL PRIVILEGES ON DATABASE autism_support TO autism_user;
```

### 2. Python environment

```bash
pip install -r requirements.txt
```

### 3. Environment variables

Copy `.env.example` to `.env` and fill in real values:

```bash
cp .env.example .env
```

**Never commit `.env`** -- it's already in `.gitignore`. Only `.env.example` (with placeholder values) is tracked.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Async Postgres connection string. URL-encode special characters in the password (e.g. `@` -> `%40`). |
| `JWT_SECRET_KEY` | Random secret for signing access tokens. Generate one, don't use the placeholder. |
| `JWT_ALGORITHM`, `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | JWT config. |
| `GOOGLE_API_KEY` | Required before the console will let you select the `gemini` AI provider. Get one free at [aistudio.google.com](https://aistudio.google.com) -- no billing required, but the free tier is capped at **20 requests/day per model per project** (see `CLAUDE.md`'s AI provider notes). |
| `DAILY_API_KEY` | Required before the console will let you select the `daily` video provider. Get it from the Daily dashboard under **Developers**. |
| `ENVIRONMENT`, `CORS_ORIGINS` | App environment name and allowed CORS origins. |

`.env` carries secrets and infrastructure only. Everything else -- AI provider and models,
classifier timeout, companion rate limits, reminder lead time, safety country, video provider,
and therapist auto-approval -- is edited in the admin console under **System > Settings**,
stored in the `app_settings` table, and applied immediately without a redeploy. Built-in
defaults live in `app/config.py`, and each field in the console has a "Reset to default" link.

Precedence is **environment variable > stored setting > built-in default**. Setting one of
those keys as a real environment variable pins it: the console shows it as "Set by the server"
and refuses to change it. That is how `tests/conftest.py` guarantees `AI_PROVIDER=mock` can
never be overridden by a stored `gemini` row.

### 4. Run the migration and seed data

```bash
python -m alembic upgrade head
python -m scripts.seed
```

This creates one admin, one therapist, one parent, and one child. The seed script prints the shared password for all three accounts.

Newly registered therapists start as `pending` and must be approved by an admin (Users > Pending therapists) before they appear in the directory or can be assigned children. Turn on "Auto-approve new therapists" in System > Settings to skip this in development. The seeded therapist is already approved. After pulling, run `alembic upgrade head` to apply the admin-features migrations.

### 5. Run the app

```bash
python -m uvicorn app.main:app --reload
```

Interactive API docs: `http://localhost:8000/docs`

## Running tests

```bash
pytest
```

Tests run against a real local Postgres (each test wrapped in a transaction that's rolled back, so nothing persists) and force `AI_PROVIDER=mock` for the whole session regardless of your local `.env` -- so tests never hit the real Gemini API by accident.

One test is opt-in and skipped by default: `test_real_classifier_accuracy_report`, which calls the real classifier against `tests/safety_cases.json` and reports how many risky messages were caught and how many safe ones were wrongly flagged. It only runs when a real `GOOGLE_API_KEY` is set in `.env`, and stops early after 3 consecutive failures rather than burning through a day's quota. Run it directly:

```bash
pytest tests/test_companion_safety.py::test_real_classifier_accuracy_report -v -s
```

Given the free tier's 20-requests/day/model cap, this test usually cannot complete all 65 cases in a single day -- see `CLAUDE.md` for the current, honestly-reported state of classifier accuracy testing.

## Before launch checklist

Carried from `CLAUDE.md` -- **none of this has been done yet.** Nothing in this codebase should reach a real child until every item below is complete:

- [ ] Clinical review of `scripts.py`, the keyword list, and the safety prompts (all currently marked `PLACEHOLDER`)
- [ ] Privacy law review (Australian Privacy Act and any applicable health data rules)
- [ ] Review of Google's guidelines for organizations serving minors, including age verification and monitoring
- [ ] Move off Gemini's free tier to a paid tier before any real child's conversation data is sent -- the free tier's terms allow Google to use inputs to improve its models
- [ ] Keep server clocks on NTP -- video meeting-token expiry and JWT expiry are both computed from the server's clock
- [ ] Encryption at rest and in transit
- [ ] Penetration test
- [ ] Terms of service state the AI is not a monitoring or emergency service

## Known gaps (not yet built)

- **No `session_notes` endpoints.** The table exists in the schema (Stage 1), but no router was ever built for therapists to write or read session notes.
- **Notifications are still mock** -- alerts and session reminders are recorded but never actually delivered. No email or SMS provider is wired up yet.
- **Daily.co is US-hosted**, so session video leaves Australia. Flag this in the privacy review; `app/video.py` is an abstraction, so a self-hosted provider in an AU region can replace it without touching the rest of the app.
- **APScheduler uses an in-memory job store** -- reminders do not survive an app restart.
- **Classifier accuracy is only partially validated** against the real model (small hand-picked samples, not the full 65-case suite) due to free-tier quota limits, and has a known, unresolved false-positive pattern on certain figurative language (e.g. "dying to know what happens"). See `CLAUDE.md`'s AI provider notes for the full detail.
