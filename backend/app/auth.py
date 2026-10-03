"""Sign up, sign in and sign out with a session cookie backed by the sessions table."""

import hashlib
import hmac
import os
import secrets
import sqlite3
from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from pydantic import BaseModel, Field, StringConstraints

from app.db import Db, utc_now

COOKIE = "session"
WEEK = 7 * 24 * 3600
EMAIL = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"

router = APIRouter(prefix="/api/auth")


class Credentials(BaseModel):
    """What a user types to sign up or sign in."""

    email: Annotated[str, StringConstraints(strip_whitespace=True, to_lower=True, pattern=EMAIL)]
    password: str = Field(min_length=8)


class User(BaseModel):
    """The signed in user as shown to the frontend."""

    email: str


def scrypt(password: str, salt: bytes) -> str:
    return hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1).hex()


def hash_password(password: str) -> str:
    """Hash a password with a random salt as "salt$hash" in hex."""
    salt = os.urandom(16)
    return f"{salt.hex()}${scrypt(password, salt)}"


def verify_password(password: str, stored: str) -> bool:
    """Check a password against a hash made by hash_password."""
    salt, digest = stored.split("$")
    return hmac.compare_digest(scrypt(password, bytes.fromhex(salt)), digest)


def hash_token(token: str | None) -> str:
    """Hash a session token so the database never holds the cookie value."""
    return hashlib.sha256((token or "").encode()).hexdigest()


def start_session(db: Db, response: Response, user_id: int) -> None:
    """Create a session for the user, clear expired ones and set the cookie on the response."""
    token = secrets.token_urlsafe(32)
    now = utc_now()
    expires = utc_now(timedelta(seconds=WEEK))
    db.execute("DELETE FROM sessions WHERE expires_at <= ?", (now,))
    db.execute(
        "INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
        (hash_token(token), user_id, now, expires),
    )
    response.set_cookie(COOKIE, token, max_age=WEEK, httponly=True, samesite="lax")


def current_user(db: Db, session: Annotated[str | None, Cookie()] = None) -> int:
    """Return the signed in user's id, or reject the request with 401."""
    row = db.execute(
        "SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?", (hash_token(session), utc_now())
    ).fetchone()
    if row is None:
        raise HTTPException(401, "Not signed in")
    return row[0]


UserId = Annotated[int, Depends(current_user)]


@router.post("/signup", status_code=201)
def signup(credentials: Credentials, response: Response, db: Db) -> User:
    """Register a new user and sign them in."""
    now = utc_now()
    try:
        cursor = db.execute(
            "INSERT INTO users (email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?)",
            (credentials.email, hash_password(credentials.password), now, now),
        )
    except sqlite3.IntegrityError:
        raise HTTPException(409, "An account with this email already exists")
    start_session(db, response, cursor.lastrowid)
    return User(email=credentials.email)


@router.post("/signin")
def signin(credentials: Credentials, response: Response, db: Db) -> User:
    """Sign in an existing user."""
    row = db.execute("SELECT id, password_hash FROM users WHERE email = ?", (credentials.email,)).fetchone()
    if row is None or not verify_password(credentials.password, row[1]):
        raise HTTPException(401, "Incorrect email or password")
    start_session(db, response, row[0])
    return User(email=credentials.email)


@router.post("/signout", status_code=204)
def signout(response: Response, db: Db, session: Annotated[str | None, Cookie()] = None) -> None:
    """End the current session."""
    db.execute("DELETE FROM sessions WHERE token_hash = ?", (hash_token(session),))
    response.delete_cookie(COOKIE)


@router.get("/me")
def me(user_id: UserId, db: Db) -> User:
    """Return the signed in user."""
    (email,) = db.execute("SELECT email FROM users WHERE id = ?", (user_id,)).fetchone()
    return User(email=email)
