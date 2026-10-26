#!/bin/sh
# Bring the database schema up to date, then serve.
#
# Compose only starts this once the database reports healthy, so there is no
# wait loop here. Set RUN_MIGRATIONS=0 to skip the upgrade -- useful if you ever
# run a second container alongside this one, so they do not both migrate.
set -eu

if [ "${RUN_MIGRATIONS:-1}" = "1" ]; then
    echo "entrypoint: applying database migrations"
    python -m alembic upgrade head
else
    echo "entrypoint: RUN_MIGRATIONS=0, skipping migrations"
fi

# --workers stays at 1 on purpose, and this is not a performance oversight:
#   * session reminders use an in-memory APScheduler job store, so every worker
#     would keep its own copy of the schedule and a reminder would fire once per
#     worker.
#   * admin-editable settings are applied to the running process, so with
#     several workers a change in the console would reach only one of them.
# Both need fixing before scaling out; until then one worker is the honest
# configuration. See TECHNICAL.md.
#
# --proxy-headers lets uvicorn see the real scheme and client IP from Caddy, so
# redirects and logs are right. It is safe here because only Caddy, on the
# compose network, can reach this port.
echo "entrypoint: starting uvicorn"
exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers 1 \
    --proxy-headers \
    --forwarded-allow-ips='*' \
    "$@"
