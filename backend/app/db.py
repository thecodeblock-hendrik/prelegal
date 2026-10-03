"""Persistent SQLite database: connections, versioned migrations and the per-request dependency."""

import os
import sqlite3
from collections.abc import Iterator
from contextlib import closing
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Annotated

from fastapi import Depends

MIGRATIONS = Path(__file__).parent / "migrations"
PRAGMAS = """
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;
PRAGMA synchronous = NORMAL;
"""


def db_path() -> Path:
    """Return the database file location, configurable via DB_PATH."""
    return Path(os.environ.get("DB_PATH", "prelegal.db"))


def utc_now(offset: timedelta = timedelta()) -> str:
    """UTC time now (plus offset) as fixed-width ISO-8601, so stored timestamps sort as text."""
    return (datetime.now(UTC) + offset).isoformat(timespec="microseconds")


def connect() -> sqlite3.Connection:
    """Open a connection with the standard pragmas.

    Reads run outside a transaction and the first write opens BEGIN IMMEDIATE, which
    takes the write lock up front and waits on busy_timeout. A deferred BEGIN would
    instead fail at once with SQLITE_BUSY_SNAPSHOT when another request commits
    between this request's read and its write.
    check_same_thread is off because FastAPI may open, use and close a request's
    connection on different threadpool threads; each connection serves one request.
    """
    conn = sqlite3.connect(db_path(), isolation_level="IMMEDIATE", check_same_thread=False)
    conn.executescript(PRAGMAS)
    return conn


def migrate(conn: sqlite3.Connection) -> None:
    """Apply each migrations/NNN_*.sql newer than PRAGMA user_version, one transaction each."""
    version = conn.execute("PRAGMA user_version").fetchone()[0]
    for path in sorted(MIGRATIONS.glob("*.sql")):
        number = int(path.stem.split("_")[0])
        if number > version:
            conn.executescript(f"BEGIN; {path.read_text()} PRAGMA user_version = {number}; COMMIT;")


def init_db() -> None:
    """Bring the database up to date and remove expired sessions."""
    db_path().parent.mkdir(parents=True, exist_ok=True)
    with closing(connect()) as conn:
        migrate(conn)
        with conn:
            conn.execute("DELETE FROM sessions WHERE expires_at <= ?", (utc_now(),))


def get_db() -> Iterator[sqlite3.Connection]:
    """Yield one connection per request: commit on success, roll back on error, always close."""
    with closing(connect()) as conn, conn:
        yield conn


Db = Annotated[sqlite3.Connection, Depends(get_db, scope="function")]
