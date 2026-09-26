import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app import db
from app.main import FrontendFiles, app


@pytest.fixture(autouse=True)
def temp_db(tmp_path, monkeypatch):
    monkeypatch.setenv("DB_PATH", str(tmp_path / "test.db"))


def test_health():
    with TestClient(app) as client:
        assert client.get("/api/health").json() == {"status": "ok"}


def test_startup_creates_users_table():
    with TestClient(app), db.connect() as conn:
        tables = conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
    assert ("users",) in tables


def test_init_db_starts_from_scratch():
    db.init_db()
    with db.connect() as conn:
        conn.execute("INSERT INTO users (email, password_hash) VALUES ('a@b.c', 'x')")
    db.init_db()
    with db.connect() as conn:
        assert conn.execute("SELECT COUNT(*) FROM users").fetchone() == (0,)


def test_frontend_files_require_revalidation(tmp_path):
    (tmp_path / "index.html").write_text("<p>hi</p>")
    frontend = FastAPI()
    frontend.mount("/", FrontendFiles(directory=tmp_path, html=True))
    response = TestClient(frontend).get("/")
    assert response.headers["cache-control"] == "no-cache"
