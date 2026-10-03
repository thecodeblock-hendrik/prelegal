from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.main import FrontendFiles, app


def test_health():
    with TestClient(app) as client:
        assert client.get("/api/health").json() == {"status": "ok"}


def test_frontend_files_require_revalidation(tmp_path):
    (tmp_path / "index.html").write_text("<p>hi</p>")
    frontend = FastAPI()
    frontend.mount("/", FrontendFiles(directory=tmp_path, html=True))
    response = TestClient(frontend).get("/")
    assert response.headers["cache-control"] == "no-cache"
