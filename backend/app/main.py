"""FastAPI entry point serving the API and the statically built frontend."""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.db import init_db

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


app.mount("/", StaticFiles(directory=STATIC_DIR, html=True, check_dir=False), name="frontend")
