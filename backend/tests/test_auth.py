from app import auth
from tests.conftest import sign_up


def test_password_hash_is_salted_and_verifies():
    first, second = auth.hash_password("secret-pass"), auth.hash_password("secret-pass")
    assert first != second
    assert auth.verify_password("secret-pass", first)
    assert not auth.verify_password("wrong-pass", first)


def test_signup_signs_the_user_in(client):
    response = sign_up(client, email=" Jane@Acme.com ")
    assert response.status_code == 201
    assert "httponly" in response.headers["set-cookie"].lower()
    assert client.get("/api/auth/me").json() == {"email": "jane@acme.com"}


def test_signup_rejects_duplicate_email(client):
    sign_up(client)
    assert sign_up(client, email="JANE@acme.com").status_code == 409


def test_signup_rejects_short_password_and_bad_email(client):
    assert sign_up(client, password="short").status_code == 422
    assert sign_up(client, email="not-an-email").status_code == 422


def test_signin_with_correct_and_wrong_password(client):
    sign_up(client)
    client.cookies.clear()
    wrong = client.post("/api/auth/signin", json={"email": "jane@acme.com", "password": "wrong-pass"})
    unknown = client.post("/api/auth/signin", json={"email": "sam@acme.com", "password": "secret-pass"})
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json()
    ok = client.post("/api/auth/signin", json={"email": "jane@acme.com", "password": "secret-pass"})
    assert ok.status_code == 200
    assert client.get("/api/auth/me").status_code == 200


def test_signout_ends_the_session(client):
    sign_up(client)
    token = client.cookies["session"]
    assert client.post("/api/auth/signout").status_code == 204
    client.cookies.set("session", token)
    assert client.get("/api/auth/me").status_code == 401


def test_me_requires_a_session(client):
    assert client.get("/api/auth/me").status_code == 401


def test_unknown_session_is_rejected(client):
    client.cookies.set("session", "forged-token")
    assert client.get("/api/auth/me").status_code == 401
