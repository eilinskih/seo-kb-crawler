FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PHRASE_NLP_HOST=0.0.0.0 \
    PHRASE_NLP_PORT=8000 \
    PHRASE_NLP_BACKEND=spacy \
    PHRASE_NLP_MODEL_DIR=/models

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY infrastructure/docker/phrase-nlp/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY infrastructure/docker/phrase-nlp/server.py /app/server.py

EXPOSE 8000

CMD ["python", "/app/server.py"]
