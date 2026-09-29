"""FastAPI entry point serving the API and the statically built frontend."""

import os
from contextlib import asynccontextmanager

from dotenv import find_dotenv, load_dotenv
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.chat import ChatRequest, ChatResponse, reply
from app.db import init_db
from app.documents import DOCUMENTS, Document

load_dotenv(find_dotenv())

STATIC_DIR = os.environ.get("STATIC_DIR", "static")


class FrontendFiles(StaticFiles):
    """Static frontend whose files browsers must revalidate, so a redeploy shows immediately."""

    def file_response(self, *args, **kwargs):
        response = super().file_response(*args, **kwargs)
        response.headers["Cache-Control"] = "no-cache"
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create a fresh database when the server starts."""
    init_db()
    yield


app = FastAPI(title="Prelegal", lifespan=lifespan)


@app.get("/api/health")
def health() -> dict[str, str]:
    """Report that the backend is running."""
    return {"status": "ok"}


@app.get("/api/documents")
def documents() -> list[Document]:
    """List the supported documents with their parties, variables and standard terms."""
    return list(DOCUMENTS.values())


@app.post("/api/chat")
def chat(request: ChatRequest) -> ChatResponse:
    """Continue the document drafting conversation."""
    return reply(request)


app.mount("/", FrontendFiles(directory=STATIC_DIR, html=True, check_dir=False), name="frontend")
