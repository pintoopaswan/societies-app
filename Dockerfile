FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends build-essential && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./backend/requirements.txt
WORKDIR /app/backend
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./

RUN mkdir -p /app/backend/data /app/backend/static/uploads/bills /app/backend/static/uploads/payments /app/backend/static/uploads/kyc

EXPOSE 5050

CMD ["sh", "-c", "python -c 'from app import init_db; init_db()' && gunicorn -w ${GUNICORN_WORKERS:-3} -b 0.0.0.0:${PORT:-5050} app:app"]
