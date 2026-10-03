"""SQLite database, recreated from scratch on every startup."""

import os
import sqlite3
from pathlib import Path

SCHEMA = """
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id)
);
CREATE TABLE drafts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    document_id TEXT,
    fields TEXT NOT NULL,
    messages TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
"""


def db_path() -> Path:
    """Return the database file location, configurable via DB_PATH."""
    return Path(os.environ.get("DB_PATH", "prelegal.db"))


def connect() -> sqlite3.Connection:
    """Open a connection to the database."""
    return sqlite3.connect(db_path())


def init_db() -> None:
    """Delete any existing database file and create a fresh schema."""
    db_path().unlink(missing_ok=True)
    with connect() as conn:
        conn.executescript(SCHEMA)
