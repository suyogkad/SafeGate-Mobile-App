# SafeGate backend.
#
# Only the files the API needs are copied in, so the image does not carry the two
# clients, the git history or the test suite. Secrets never enter the image: they
# arrive at run time through env_file (see docker-compose.yml).
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Dependencies first, so a code change does not reinstall them on every build.
# asyncpg, bcrypt and cryptography all ship manylinux wheels for CPython 3.12,
# so no compiler is needed and the image stays small.
COPY requirements.txt .
RUN pip install -r requirements.txt

# Just the backend. alembic/ and alembic.ini are needed because the container
# runs migrations on start; scripts/ carries the seed command.
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./alembic.ini
COPY scripts ./scripts
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh

# Run as a normal user. Nothing in the container needs to write to /app.
RUN chmod +x /usr/local/bin/entrypoint.sh \
    && useradd --create-home --uid 10001 safegate \
    && chown -R safegate:safegate /app
USER safegate

EXPOSE 8000

# Python rather than curl, so the image needs no extra packages.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD python -c "import sys,urllib.request; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=4).status == 200 else 1)"

ENTRYPOINT ["entrypoint.sh"]
