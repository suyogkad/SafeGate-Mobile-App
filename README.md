# Autism Support Platform -- Backend

A support and learning tool for autistic children: parents book online sessions with therapists, and children use a guided AI companion under a defence layer of safety checks. This is **not** a therapy, treatment, diagnostic, or emergency service -- see `CLAUDE.md` for the full set of non-negotiable safety and privacy rules this codebase follows.

This repo also contains two clients: `frontend/`, the admin web console (Vite + React + Tailwind, see `frontend/README.md`), and `mobile/`, the parent + therapist app with a supervised child mode (Expo / React Native, see `mobile/README.md`).

## Documentation

- **`TECHNICAL.md`** -- setup, the code map, how a request flows, where each safety rule
  is enforced, the data model, every endpoint, and what is not built. Start here.
- **`USERMANUAL.md`** -- how the administrator, therapists, parents and children actually
  use the app, A to Z, with no technical content.
- **`CLAUDE.md`** -- the non-negotiable safety and privacy rules this codebase follows.
- **`mobile/HANDOFF.md`** -- authoritative for the mobile product: every screen, the 21
  numbered product rules, and the wording that is a compliance surface.

## Stack

- Python 3.12, FastAPI, Pydantic v2
- PostgreSQL, SQLAlchemy 2.0 (async), Alembic migrations
- Groq (`openai/gpt-oss-120b`) for the AI companion and the safety classifier, behind a provider abstraction; Gemini is kept as a second provider. The provider is chosen in the admin console, not in `.env`.
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
| `GROQ_API_KEY` | Required before the console will let you select the `groq` provider. Get one free at [console.groq.com](https://console.groq.com) -- note this is **Groq**, not xAI's **Grok**. |
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

Tests that call the real model are marked `real_model` and excluded from the default run. The accuracy report calls the real classifier against `tests/safety_cases.json` and reports how many risky messages were caught and how many safe ones were wrongly flagged:

```bash
pytest -m real_model -s
```

On Groq the full 65-case suite completes in one run. Last full run (6 Oct 2026, `openai/gpt-oss-120b`): **44/44 risky caught, 0/20 safe wrongly flagged**, one transient error retried. That is a smoke test, not clinical validation, and the prompts are still `PLACEHOLDER` -- see `CLAUDE.md`.

## Before launch checklist

Carried from `CLAUDE.md` -- **none of this has been done yet.** Nothing in this codebase should reach a real child until every item below is complete:

- [ ] Clinical review of `scripts.py`, the keyword list, and the safety prompts (all currently marked `PLACEHOLDER`)
- [ ] Privacy law review (Australian Privacy Act and any applicable health data rules)
- [ ] Review of Google's guidelines for organizations serving minors, including age verification and monitoring
- [ ] Check the active provider's terms on training with inputs before any real child's data is sent. Groq is the active provider; Gemini is kept as a fallback and its free tier allows Google to train on inputs
- [ ] Check the speech-to-text provider's retention and training terms -- audio is not stored by SafeGate, but a child's voice does leave the server
- [ ] Keep server clocks on NTP -- video meeting-token expiry and JWT expiry are both computed from the server's clock
- [ ] Encryption at rest and in transit
- [ ] Penetration test
- [ ] Terms of service state the AI is not a monitoring or emergency service

## Known gaps (not yet built)

- **Notifications are still mock** -- alerts and session reminders are recorded but never actually delivered. No email or SMS provider is wired up yet.
- **Daily.co is US-hosted**, so session video leaves Australia. Flag this in the privacy review; `app/video.py` is an abstraction, so a self-hosted provider in an AU region can replace it without touching the rest of the app.
- **APScheduler uses an in-memory job store** -- reminders do not survive an app restart.
- **Classifier accuracy is a smoke test, not clinical validation.** The full 65-case suite now runs against the real model and passed cleanly, but the prompts, scripts and keyword list are all still `PLACEHOLDER` and need a clinician. See `CLAUDE.md`.
- **See `TECHNICAL.md` section 14** for the full, current list of what is not built.
