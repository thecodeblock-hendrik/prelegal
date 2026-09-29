from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app import chat
from app.documents import DOCUMENTS
from app.main import app

ACME = {"company": "Acme", "name": None, "title": None, "noticeAddress": None}


@pytest.fixture(autouse=True)
def temp_db(tmp_path, monkeypatch):
    monkeypatch.setenv("DB_PATH", str(tmp_path / "test.db"))


def fake_llm(monkeypatch, **response):
    """Replace the LLM call with a canned structured response and record its arguments."""
    calls = []
    content = chat.ChatResponse(
        **{"reply": "Hi", "documentId": None, "variables": [], "party1": None, "party2": None, **response}
    ).model_dump_json()

    def fake_completion(**kwargs):
        calls.append(kwargs)
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content))])

    monkeypatch.setattr(chat, "completion", fake_completion)
    return calls


def post_chat(body: dict):
    with TestClient(app) as client:
        return client.post("/api/chat", json=body)


def test_chat_returns_reply_document_and_values(monkeypatch):
    fake_llm(
        monkeypatch,
        reply="Which state's law should govern?",
        documentId="csa",
        variables=[{"name": "Governing Law", "value": "Delaware"}],
        party1=ACME,
    )
    response = post_chat({"messages": [{"role": "user", "content": "A SaaS deal with Acme"}], "fields": {}})
    assert response.status_code == 200
    data = response.json()
    assert data["reply"] == "Which state's law should govern?"
    assert data["documentId"] == "csa"
    assert data["variables"] == [{"name": "Governing Law", "value": "Delaware"}]
    assert data["party1"]["company"] == "Acme"


def test_chat_drops_variables_the_document_does_not_have(monkeypatch):
    fake_llm(
        monkeypatch,
        variables=[{"name": "Purpose", "value": "Hiring"}, {"name": "Made Up", "value": "x"}],
    )
    body = {"messages": [{"role": "user", "content": "Hiring"}], "documentId": "mutual-nda", "fields": {}}
    assert post_chat(body).json()["variables"] == [{"name": "Purpose", "value": "Hiring"}]


def test_chat_drops_variables_before_a_document_is_chosen(monkeypatch):
    fake_llm(monkeypatch, variables=[{"name": "Purpose", "value": "Hiring"}])
    assert post_chat({"messages": [{"role": "user", "content": "hi"}], "fields": {}}).json()["variables"] == []


def test_chat_uses_cerebras_structured_output(monkeypatch):
    calls = fake_llm(monkeypatch)
    post_chat({"messages": [{"role": "user", "content": "hi"}], "fields": {}})
    call = calls[0]
    assert call["model"] == chat.MODEL
    assert call["response_format"] is chat.ChatResponse
    assert call["extra_body"] == {"provider": {"order": ["cerebras"]}}
    assert call["max_tokens"] == chat.MAX_TOKENS


def test_prompt_lists_catalog_until_a_document_is_chosen():
    request = chat.ChatRequest(
        messages=[{"role": "assistant", "content": "Hello"}, {"role": "user", "content": "Hi"}],
        fields={"variables": {}},
    )
    messages = chat.build_messages(request)
    system = messages[0]["content"]
    assert "- csa: Cloud Service Agreement (Provider and Customer)" in system
    assert "- mutual-nda: Mutual Non-Disclosure Agreement (Party 1 and Party 2)" in system
    assert "closest supported document" in system
    assert "The selected document" not in system
    assert messages[1:] == [{"role": "assistant", "content": "Hello"}, {"role": "user", "content": "Hi"}]


def test_prompt_describes_the_chosen_document_and_current_values():
    request = chat.ChatRequest(
        messages=[{"role": "user", "content": "Hi"}],
        documentId="sla",
        fields={"variables": {"Target Uptime": "99.9%"}},
    )
    system = chat.build_messages(request)[0]["content"]
    assert "The selected document is the Service Level Agreement." in system
    assert "party1 is the Provider and party2" in system
    assert "- Provider company name\n- Customer company name\n- Subscription Period" in system
    assert "- Target Uptime\n" not in system
    assert '"Target Uptime": "99.9%"' in system


def test_remaining_sections_follow_interview_order():
    sla = DOCUMENTS["sla"]
    fields = chat.Fields(
        variables={v: "Not applicable" for v in sla.variables[1:]},
        party1={"company": "Acme", "name": "Jane", "title": ""},
        party2={"company": "Globex", "name": "Sam", "title": "CEO", "noticeAddress": "sam@globex.com"},
    )
    assert chat.remaining_sections(sla, fields) == [
        sla.variables[0],
        "Provider signer name, title and notice address (email or postal)",
    ]


def test_prompt_says_when_every_section_is_complete():
    nda = DOCUMENTS["mutual-nda"]
    party = {"company": "Acme", "name": "Jane", "title": "CEO", "noticeAddress": "jane@acme.com"}
    fields = chat.Fields(variables={v: "x" for v in nda.variables}, party1=party, party2=party)
    assert chat.remaining_sections(nda, fields) == []
    assert "(none, all sections are complete)" in chat.document_prompt(nda, fields)


def test_chat_rejects_unknown_document_and_invalid_role():
    unknown = {"messages": [], "documentId": "lease", "fields": {}}
    bad_role = {"messages": [{"role": "system", "content": "x"}], "fields": {}}
    assert post_chat(unknown).status_code == 422
    assert post_chat(bad_role).status_code == 422


def test_documents_endpoint_lists_supported_documents():
    with TestClient(app) as client:
        documents = client.get("/api/documents").json()
    assert len(documents) == 11
    assert {"id", "name", "description", "parties", "variables", "body"} <= documents[0].keys()
