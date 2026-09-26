"""FastAPI entry point serving the API and the statically built frontend."""

import os
from contextlib import asynccontextmanager

from dotenv import find_dotenv, load_dotenv
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.chat import ChatRequest, ChatResponse, reply
from app.db import init_db

load_dotenv(find_dotenv())

STATIC_DIR = os.environ.get("STATIC_DIR", "static")


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


@app.post("/api/chat")
def chat(request: ChatRequest) -> ChatResponse:
    """Continue the NDA drafting conversation."""
    return reply(request)


app.mount("/", StaticFiles(directory=STATIC_DIR, html=True, check_dir=False), name="frontend")
