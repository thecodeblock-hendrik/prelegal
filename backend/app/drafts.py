"""Each user's saved drafts: the chosen document, its values and the chat so far."""

import json

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.auth import UserId
from app.chat import ChatMessage, ChatRequest, DocumentId, Fields
from app.db import Db, utc_now

router = APIRouter(prefix="/api/drafts")

SUMMARY_COLUMNS = "id, document_id, fields, updated_at"


class DraftSummary(BaseModel):
    """A draft as listed on the dashboard, without its chat."""

    id: int
    documentId: DocumentId | None
    fields: Fields
    updatedAt: str


class Draft(DraftSummary):
    messages: list[ChatMessage]


def to_summary(row: tuple) -> DraftSummary:
    """Build a DraftSummary from a row selected with SUMMARY_COLUMNS."""
    draft_id, document_id, fields, updated_at = row
    return DraftSummary(id=draft_id, documentId=document_id, fields=json.loads(fields), updatedAt=updated_at)


def stored_values(body: ChatRequest) -> tuple:
    """The document id, fields JSON, messages JSON and timestamp to store for a draft."""
    messages = json.dumps([m.model_dump() for m in body.messages])
    return body.documentId, body.fields.model_dump_json(), messages, utc_now()


def not_found() -> HTTPException:
    return HTTPException(404, "Draft not found")


def load(db: Db, user_id: int, draft_id: int) -> Draft:
    """Return the user's draft, or 404 if it does not exist or belongs to someone else."""
    row = db.execute(
        f"SELECT {SUMMARY_COLUMNS}, messages FROM drafts WHERE id = ? AND user_id = ?", (draft_id, user_id)
    ).fetchone()
    if row is None:
        raise not_found()
    return Draft(**to_summary(row[:4]).model_dump(), messages=json.loads(row[4]))


@router.get("")
def list_drafts(user_id: UserId, db: Db) -> list[DraftSummary]:
    """List the user's drafts, most recently updated first."""
    rows = db.execute(
        f"SELECT {SUMMARY_COLUMNS} FROM drafts WHERE user_id = ? ORDER BY updated_at DESC", (user_id,)
    ).fetchall()
    return [to_summary(row) for row in rows]


@router.post("", status_code=201)
def create_draft(body: ChatRequest, user_id: UserId, db: Db) -> Draft:
    """Save a new draft."""
    document_id, fields, messages, now = stored_values(body)
    cursor = db.execute(
        "INSERT INTO drafts (user_id, document_id, fields, messages, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        (user_id, document_id, fields, messages, now, now),
    )
    return load(db, user_id, cursor.lastrowid)


@router.get("/{draft_id}")
def get_draft(draft_id: int, user_id: UserId, db: Db) -> Draft:
    """Return one draft with its chat."""
    return load(db, user_id, draft_id)


@router.put("/{draft_id}")
def update_draft(draft_id: int, body: ChatRequest, user_id: UserId, db: Db) -> Draft:
    """Replace a draft's document, values and chat."""
    cursor = db.execute(
        "UPDATE drafts SET document_id = ?, fields = ?, messages = ?, updated_at = ? WHERE id = ? AND user_id = ?",
        (*stored_values(body), draft_id, user_id),
    )
    if cursor.rowcount == 0:
        raise not_found()
    return load(db, user_id, draft_id)


@router.delete("/{draft_id}", status_code=204)
def delete_draft(draft_id: int, user_id: UserId, db: Db) -> None:
    """Delete a draft."""
    cursor = db.execute("DELETE FROM drafts WHERE id = ? AND user_id = ?", (draft_id, user_id))
    if cursor.rowcount == 0:
        raise not_found()
