import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(autouse=True)
def temp_db(tmp_path, monkeypatch):
    monkeypatch.setenv("DB_PATH", str(tmp_path / "test.db"))


@pytest.fixture
def client():
    with TestClient(app) as client:
        yield client


def sign_up(client: TestClient, email: str = "jane@acme.com", password: str = "secret-pass"):
    """Register a user; the client keeps the session cookie."""
    return client.post("/api/auth/signup", json={"email": email, "password": password})
