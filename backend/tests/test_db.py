import hashlib
import sqlite3
from concurrent.futures import ThreadPoolExecutor
from contextlib import closing
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient

from app import db
from app.main import app
from tests.conftest import sign_up
from tests.test_drafts import BODY

LATEST = max(int(path.stem.split("_")[0]) for path in db.MIGRATIONS.glob("*.sql"))


def query(sql: str, *params) -> list[tuple]:
    """Run one statement on its own connection, commit and return the rows."""
    with closing(db.connect()) as conn, conn:
        return conn.execute(sql, params).fetchall()


def add_user(email: str = "jane@acme.com") -> int:
    now = db.utc_now()
    return query(
        "INSERT INTO users (email, password_hash, created_at, updated_at) VALUES (?, 'x', ?, ?) RETURNING id",
        email,
        now,
        now,
    )[0][0]


def add_draft(user_id: int, fields: str = "{}", messages: str = "[]") -> None:
    now = db.utc_now()
    query(
        "INSERT INTO drafts (user_id, fields, messages, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        user_id,
        fields,
        messages,
        now,
        now,
    )


@pytest.fixture(autouse=True)
def migrated():
    db.init_db()


def test_fresh_database_migrates_to_latest_version():
    assert query("PRAGMA user_version") == [(LATEST,)]
    tables = {name for (name,) in query("SELECT name FROM sqlite_master WHERE type = 'table'")}
    assert {"users", "sessions", "drafts"} <= tables


def test_migrating_again_keeps_data_and_version():
    add_user()
    db.init_db()
    assert query("PRAGMA user_version") == [(LATEST,)]
    assert query("SELECT email FROM users") == [("jane@acme.com",)]


def test_every_connection_applies_the_pragmas():
    pragmas = ("foreign_keys", "journal_mode", "busy_timeout", "synchronous")
    with closing(db.connect()) as conn:
        values = [conn.execute(f"PRAGMA {name}").fetchone()[0] for name in pragmas]
    assert values == [1, "wal", 5000, 1]


def test_deleting_a_user_cascades_to_sessions_and_drafts(client):
    sign_up(client)
    client.post("/api/drafts", json=BODY)
    query("DELETE FROM users")
    assert query("SELECT COUNT(*) FROM sessions") == [(0,)]
    assert query("SELECT COUNT(*) FROM drafts") == [(0,)]


def test_draft_for_unknown_user_is_rejected():
    with pytest.raises(sqlite3.IntegrityError, match="FOREIGN KEY"):
        add_draft(999)


def test_email_is_unique_regardless_of_case():
    add_user("jane@acme.com")
    with pytest.raises(sqlite3.IntegrityError, match="UNIQUE"):
        add_user("JANE@ACME.COM")


@pytest.mark.parametrize("column", ["fields", "messages"])
def test_invalid_json_is_rejected(column):
    user_id = add_user()
    with pytest.raises(sqlite3.IntegrityError, match="CHECK"):
        add_draft(user_id, **{column: "not json"})


def test_sessions_store_only_a_hash_of_the_token(client):
    sign_up(client)
    token = client.cookies["session"]
    assert query("SELECT token_hash FROM sessions") == [(hashlib.sha256(token.encode()).hexdigest(),)]


def test_expired_session_is_rejected(client):
    sign_up(client)
    query("UPDATE sessions SET expires_at = ?", db.utc_now(timedelta(seconds=-1)))
    assert client.get("/api/auth/me").status_code == 401


def test_expired_sessions_are_removed_on_startup():
    user_id = add_user()
    now = db.utc_now()
    query(
        "INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES ('old', ?, ?, ?)",
        user_id,
        now,
        now,
    )
    db.init_db()
    assert query("SELECT COUNT(*) FROM sessions") == [(0,)]


def test_draft_list_uses_the_user_and_updated_index():
    plan = query("EXPLAIN QUERY PLAN SELECT id FROM drafts WHERE user_id = ? ORDER BY updated_at DESC", 1)
    assert "drafts_user_id_updated_at" in plan[0][-1]
    assert not any("TEMP B-TREE" in row[-1] for row in plan)


def test_users_and_drafts_persist_across_restarts():
    with TestClient(app) as client:
        sign_up(client)
        draft_id = client.post("/api/drafts", json=BODY).json()["id"]
    with TestClient(app) as client:
        client.post("/api/auth/signin", json={"email": "jane@acme.com", "password": "secret-pass"})
        assert [d["id"] for d in client.get("/api/drafts").json()] == [draft_id]


def test_request_connection_rolls_back_on_error_and_closes():
    user_id = add_user()
    requests = db.get_db()
    conn = next(requests)
    add = "INSERT INTO drafts (user_id, fields, messages, created_at, updated_at) VALUES (?, '{}', '[]', '', '')"
    conn.execute(add, (user_id,))
    with pytest.raises(RuntimeError):
        requests.throw(RuntimeError("handler failed"))
    assert query("SELECT COUNT(*) FROM drafts") == [(0,)]
    with pytest.raises(sqlite3.ProgrammingError, match="closed"):
        conn.execute("SELECT 1")


def test_request_connection_works_across_threads():
    """FastAPI may open the dependency, run the handler and close it on different threadpool threads."""
    requests = db.get_db()
    conn = next(requests)
    with ThreadPoolExecutor(1) as other_thread:
        assert other_thread.submit(lambda: conn.execute("SELECT 1").fetchone()).result() == (1,)
    requests.close()


def test_write_after_read_survives_a_concurrent_commit():
    """A request that reads, then writes after another request committed, must not hit SQLITE_BUSY_SNAPSHOT."""
    user_id = add_user()
    with closing(db.connect()) as request, request:
        request.execute("SELECT COUNT(*) FROM drafts").fetchone()
        add_draft(user_id)
        add_draft_sql = "INSERT INTO drafts (user_id, fields, messages, created_at, updated_at) VALUES (?, '{}', '[]', '', '')"
        request.execute(add_draft_sql, (user_id,))
    assert query("SELECT COUNT(*) FROM drafts") == [(2,)]
