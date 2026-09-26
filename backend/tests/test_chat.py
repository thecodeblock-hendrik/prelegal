from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app import chat
from app.main import app

EMPTY_UPDATE = {
    "purpose": None,
    "effectiveDate": None,
    "termChoice": None,
    "termYears": None,
    "confidentialityChoice": None,
    "confidentialityYears": None,
    "governingLaw": None,
    "jurisdiction": None,
    "modifications": None,
    "party1": None,
    "party2": None,
}


@pytest.fixture(autouse=True)
def temp_db(tmp_path, monkeypatch):
    monkeypatch.setenv("DB_PATH", str(tmp_path / "test.db"))


@pytest.fixture
def fake_llm(monkeypatch):
    """Replace the LLM call with a canned structured response and record its arguments."""
    calls = []
    content = chat.ChatResponse(
        reply="Which state's law should govern?",
        fields={**EMPTY_UPDATE, "party1": {"company": "Acme", "name": None, "title": None, "noticeAddress": None}},
    ).model_dump_json()

    def fake_completion(**kwargs):
        calls.append(kwargs)
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content))])

    monkeypatch.setattr(chat, "completion", fake_completion)
    return calls


def test_chat_returns_reply_and_fields(fake_llm):
    body = {"messages": [{"role": "user", "content": "I'm at Acme"}], "fields": {"governingLaw": ""}}
    with TestClient(app) as client:
        response = client.post("/api/chat", json=body)
    assert response.status_code == 200
    data = response.json()
    assert data["reply"] == "Which state's law should govern?"
    assert data["fields"]["party1"]["company"] == "Acme"
    assert data["fields"]["governingLaw"] is None


def test_chat_uses_cerebras_structured_output(fake_llm):
    body = {"messages": [{"role": "user", "content": "hi"}], "fields": {}}
    with TestClient(app) as client:
        client.post("/api/chat", json=body)
    call = fake_llm[0]
    assert call["model"] == chat.MODEL
    assert call["response_format"] is chat.ChatResponse
    assert call["extra_body"] == {"provider": {"order": ["cerebras"]}}


def test_build_messages_includes_current_values():
    request = chat.ChatRequest(
        messages=[{"role": "assistant", "content": "Hello"}, {"role": "user", "content": "Hi"}],
        fields={"governingLaw": "Delaware"},
    )
    messages = chat.build_messages(request)
    assert messages[0]["role"] == "system"
    assert '"governingLaw": "Delaware"' in messages[0]["content"]
    assert messages[1:] == [{"role": "assistant", "content": "Hello"}, {"role": "user", "content": "Hi"}]


def test_chat_rejects_invalid_role():
    body = {"messages": [{"role": "system", "content": "x"}], "fields": {}}
    with TestClient(app) as client:
        assert client.post("/api/chat", json=body).status_code == 422
