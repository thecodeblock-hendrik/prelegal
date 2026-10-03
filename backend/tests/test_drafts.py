import pytest

from tests.conftest import sign_up

ACME = {"company": "Acme", "name": "Jane", "title": "CEO", "noticeAddress": "jane@acme.com"}
BODY = {
    "messages": [{"role": "user", "content": "An NDA with Globex"}, {"role": "assistant", "content": "Purpose?"}],
    "documentId": "mutual-nda",
    "fields": {"variables": {"Purpose": "Hiring"}, "party1": ACME},
}


@pytest.fixture
def jane(client):
    sign_up(client)
    return client


def test_drafts_require_sign_in(client):
    assert client.get("/api/drafts").status_code == 401
    assert client.post("/api/drafts", json=BODY).status_code == 401
    assert client.get("/api/drafts/1").status_code == 401
    assert client.put("/api/drafts/1", json=BODY).status_code == 401
    assert client.delete("/api/drafts/1").status_code == 401


def test_create_then_get_round_trips_the_draft(jane):
    created = jane.post("/api/drafts", json=BODY)
    assert created.status_code == 201
    draft = jane.get(f"/api/drafts/{created.json()['id']}").json()
    assert draft["documentId"] == "mutual-nda"
    assert draft["fields"]["variables"] == {"Purpose": "Hiring"}
    assert draft["fields"]["party1"] == ACME
    assert draft["messages"] == BODY["messages"]


def test_update_replaces_the_draft(jane):
    created = jane.post("/api/drafts", json=BODY).json()
    body = {**BODY, "documentId": "csa", "messages": BODY["messages"][:1]}
    updated = jane.put(f"/api/drafts/{created['id']}", json=body).json()
    assert updated["documentId"] == "csa"
    assert updated["messages"] == BODY["messages"][:1]
    assert updated["updatedAt"] > created["updatedAt"]


def test_list_is_newest_first_without_messages(jane):
    first = jane.post("/api/drafts", json=BODY).json()
    second = jane.post("/api/drafts", json={**BODY, "documentId": None}).json()
    drafts = jane.get("/api/drafts").json()
    assert [d["id"] for d in drafts] == [second["id"], first["id"]]
    assert "messages" not in drafts[0]
    assert drafts[0]["documentId"] is None


def test_delete_removes_the_draft(jane):
    draft_id = jane.post("/api/drafts", json=BODY).json()["id"]
    assert jane.delete(f"/api/drafts/{draft_id}").status_code == 204
    assert jane.get(f"/api/drafts/{draft_id}").status_code == 404
    assert jane.get("/api/drafts").json() == []


def test_users_cannot_see_each_others_drafts(jane):
    draft_id = jane.post("/api/drafts", json=BODY).json()["id"]
    sign_up(jane, email="sam@globex.com")
    assert jane.get("/api/drafts").json() == []
    assert jane.get(f"/api/drafts/{draft_id}").status_code == 404
    assert jane.put(f"/api/drafts/{draft_id}", json=BODY).status_code == 404
    assert jane.delete(f"/api/drafts/{draft_id}").status_code == 404


def test_draft_rejects_unknown_document(jane):
    assert jane.post("/api/drafts", json={**BODY, "documentId": "lease"}).status_code == 422


def test_draft_rejects_invalid_messages(jane):
    body = {**BODY, "messages": [{"role": "system", "content": "x"}]}
    assert jane.post("/api/drafts", json=body).status_code == 422
