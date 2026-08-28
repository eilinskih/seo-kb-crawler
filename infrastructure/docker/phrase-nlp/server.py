import os
from functools import lru_cache
from threading import Lock
from typing import Any, Literal

import spacy
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from spacy.cli import download as spacy_download
from ufal.udpipe import Model, Pipeline

try:
    import stanza
except ImportError:
    stanza = None


Backend = Literal["stanza", "spacy", "udpipe"]


class AnalyzeRequest(BaseModel):
    text: str
    language: str | None = "en"


class TokenResponse(BaseModel):
    text: str
    lemma: str | None = None
    pos: str | None = None
    dep: str | None = None
    entityType: str | None = None


class EntityResponse(BaseModel):
    text: str
    type: str | None = None
    confidence: float | None = None


class AnalyzeResponse(BaseModel):
    backend: str
    language: str
    tokens: list[TokenResponse]
    entities: list[EntityResponse] = []


app = FastAPI(title="SEO KB Phrase NLP", version="0.1.0")
_spacy_model_lock = Lock()


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "backend": backend(),
    }


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(request: AnalyzeRequest) -> AnalyzeResponse:
    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is required")

    language = normalize_language(request.language)
    selected = backend()

    if selected == "stanza":
        return analyze_with_stanza(text, language)
    if selected == "spacy":
        return analyze_with_spacy(text, language)
    if selected == "udpipe":
        return analyze_with_udpipe(text, language)

    raise HTTPException(status_code=500, detail=f"unsupported backend: {selected}")


def backend() -> Backend:
    value = os.getenv("PHRASE_NLP_BACKEND", "spacy").strip().lower()
    if value in {"stanza", "spacy", "udpipe"}:
        return value  # type: ignore[return-value]
    return "spacy"


def normalize_language(language: str | None) -> str:
    if not language:
        return "en"
    return language.split("-")[0].lower()


def configured_languages() -> set[str]:
    raw = os.getenv("PHRASE_NLP_LANGUAGES", "en,pl")
    return {
        normalize_language(language)
        for language in raw.split(",")
        if language.strip()
    }


@lru_cache(maxsize=16)
def stanza_pipeline(language: str) -> Any:
    if stanza is None:
        raise HTTPException(
            status_code=503,
            detail="Stanza backend requires a custom image with stanza installed",
        )

    if language not in configured_languages():
        raise HTTPException(
            status_code=400,
            detail=f"language '{language}' is not enabled in PHRASE_NLP_LANGUAGES",
        )

    model_dir = os.getenv("PHRASE_NLP_MODEL_DIR", "/models/stanza")
    processors = os.getenv("PHRASE_NLP_STANZA_PROCESSORS", "tokenize,pos,lemma")
    stanza.download(
        language,
        processors=processors,
        model_dir=model_dir,
        verbose=False,
    )
    return stanza.Pipeline(
        lang=language,
        processors=processors,
        model_dir=model_dir,
        verbose=False,
        use_gpu=False,
    )


def analyze_with_stanza(text: str, language: str) -> AnalyzeResponse:
    pipeline = stanza_pipeline(language)
    doc = pipeline(text)
    tokens: list[TokenResponse] = []

    for sentence in doc.sentences:
        for word in sentence.words:
            tokens.append(TokenResponse(
                text=word.text,
                lemma=word.lemma,
                pos=word.upos,
                dep=word.deprel,
                entityType=None,
            ))

    return AnalyzeResponse(
        backend="stanza",
        language=language,
        tokens=tokens,
        entities=[],
    )


@lru_cache(maxsize=16)
def spacy_pipeline(language: str) -> Any:
    model_name = language_model_name(language)
    with _spacy_model_lock:
        try:
            return spacy.load(model_name)
        except OSError:
            if should_download_spacy_models():
                spacy_download(model_name)
                return spacy.load(model_name)
            try:
                return spacy.blank(language)
            except ImportError:
                return spacy.blank("xx")


def language_model_name(language: str) -> str:
    return {
        "en": "en_core_web_sm",
        "pl": "pl_core_news_sm",
        "de": "de_core_news_sm",
        "fr": "fr_core_news_sm",
        "es": "es_core_news_sm",
        "it": "it_core_news_sm",
        "pt": "pt_core_news_sm",
        "nl": "nl_core_news_sm",
    }.get(language, language)


def should_download_spacy_models() -> bool:
    value = os.getenv("PHRASE_NLP_DOWNLOAD_SPACY_MODELS", "true")
    return value.lower() in {"1", "true", "yes", "on"}


def analyze_with_spacy(text: str, language: str) -> AnalyzeResponse:
    doc = spacy_pipeline(language)(text)
    return AnalyzeResponse(
        backend="spacy",
        language=language,
        tokens=[
            TokenResponse(
                text=token.text,
                lemma=token.lemma_ or None,
                pos=token.pos_ or None,
                dep=token.dep_ or None,
                entityType=token.ent_type_ or None,
            )
            for token in doc
        ],
        entities=[
            EntityResponse(
                text=entity.text,
                type=entity.label_,
                confidence=None,
            )
            for entity in doc.ents
        ],
    )


@lru_cache(maxsize=16)
def udpipe_pipeline(language: str) -> Pipeline:
    model_path = os.getenv(f"PHRASE_NLP_UDPIPE_MODEL_{language.upper()}") \
        or os.getenv("PHRASE_NLP_UDPIPE_MODEL")
    if not model_path:
        raise HTTPException(
            status_code=503,
            detail="UDPipe backend requires PHRASE_NLP_UDPIPE_MODEL or PHRASE_NLP_UDPIPE_MODEL_<LANG>",
        )

    model = Model.load(model_path)
    if model is None:
        raise HTTPException(status_code=503, detail=f"failed to load UDPipe model: {model_path}")

    return Pipeline(model, "tokenize", Pipeline.DEFAULT, Pipeline.DEFAULT, "conllu")


def analyze_with_udpipe(text: str, language: str) -> AnalyzeResponse:
    conllu = udpipe_pipeline(language).process(text)
    tokens: list[TokenResponse] = []

    for line in conllu.splitlines():
        if not line or line.startswith("#"):
            continue
        columns = line.split("\t")
        if len(columns) < 8 or "-" in columns[0] or "." in columns[0]:
            continue
        tokens.append(TokenResponse(
            text=columns[1],
            lemma=columns[2] if columns[2] != "_" else None,
            pos=columns[3] if columns[3] != "_" else None,
            dep=columns[7] if columns[7] != "_" else None,
            entityType=None,
        ))

    return AnalyzeResponse(
        backend="udpipe",
        language=language,
        tokens=tokens,
        entities=[],
    )


if __name__ == "__main__":
    uvicorn.run(
        "server:app",
        host=os.getenv("PHRASE_NLP_HOST", "0.0.0.0"),
        port=int(os.getenv("PHRASE_NLP_PORT", "8000")),
        reload=False,
    )
