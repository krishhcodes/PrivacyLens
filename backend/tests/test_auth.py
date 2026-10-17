"""Accounts: sign-in tokens, per-user data, device tokens, report links, delete my data."""
import os
import sqlite3
import time

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi.testclient import TestClient

from app.main import create_app
from tests.conftest import DEMO, ENC, ledger

SECRET = "test-secret-with-at-least-32-bytes!!"
PG_URL = os.environ.get("CONSENTSCOPE_TEST_PG")  # e.g. postgresql://postgres@/cs_test?host=/var/tmp&port=5433


def token(sub, email=None, key=SECRET, alg="HS256", exp_in=3600, aud="authenticated", kid=None):
    claims = {"sub": sub, "aud": aud, "exp": int(time.time()) + exp_in, "role": "authenticated"}
    if email:
        claims["email"] = email
    return jwt.encode(claims, key, algorithm=alg, headers={"kid": kid} if kid else None)


def bearer(t):
    return {"Authorization": f"Bearer {t}"}


def _reset_pg():
    import psycopg
    with psycopg.connect(PG_URL, autocommit=True) as c:
        c.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")


@pytest.fixture(params=["sqlite"] + (["postgres"] if PG_URL else []))
def hosted(request, monkeypatch):
    monkeypatch.setenv("SUPABASE_JWT_SECRET", SECRET)
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    if request.param == "postgres":
        _reset_pg()
        target = PG_URL
    else:
        target = ":memory:"
    with TestClient(create_app(target)) as c:
        yield c


def audit(c, headers, origin=DEMO):
    r = c.post("/audits", headers=headers, json={"origin": origin, "observations": ledger()})
    assert r.status_code == 200, r.text
    return r


def test_health_is_open_and_says_supabase(hosted):
    assert hosted.get("/health").json()["auth"] == "supabase"


@pytest.mark.parametrize("path", ["/sites", "/me", f"/sites/{ENC}", f"/sites/{ENC}/report"])
def test_requests_without_sign_in_are_refused(hosted, path):
    assert hosted.get(path).status_code == 401


def test_bad_tokens_are_refused(hosted):
    assert hosted.get("/sites", headers=bearer("not-a-jwt")).status_code == 401
    assert hosted.get("/sites", headers=bearer(token("u1", exp_in=-10))).status_code == 401
    assert hosted.get("/sites", headers=bearer(token("u1", key="wrong-secret-wrong-secret-wrong!!"))).status_code == 401
    assert hosted.get("/sites", headers=bearer(token("u1", aud="anon"))).status_code == 401
    assert hosted.get("/sites", headers=bearer("cs_unknown")).status_code == 401


def test_each_user_sees_only_their_own_sites(hosted):
    a, b = bearer(token("user-a", "a@example.com")), bearer(token("user-b"))
    audit(hosted, a)
    assert [s["origin"] for s in hosted.get("/sites", headers=a).json()["sites"]] == [DEMO]
    assert hosted.get("/sites", headers=b).json()["sites"] == []
    assert hosted.get(f"/sites/{ENC}", headers=b).status_code == 404
    # Same site for B is a separate record.
    audit(hosted, b)
    assert hosted.put(f"/sites/{ENC}/purpose", headers=b, json={"purpose_profile": "maps"}).status_code == 200
    assert hosted.get(f"/sites/{ENC}", headers=a).json()["purpose_source"] == "inferred"
    assert hosted.get(f"/sites/{ENC}", headers=b).json()["purpose_profile"] == "maps"
    assert hosted.get("/me", headers=a).json() == {"user_id": "user-a", "email": "a@example.com", "auth": "supabase"}


def test_policy_and_actions_are_per_user(hosted):
    a, b = bearer(token("user-a")), bearer(token("user-b"))
    audit(hosted, a), audit(hosted, b)
    text = "We may share your precise location with advertising partners."
    assert hosted.post("/policy/analyze", headers=a, json={"text": text, "origin": DEMO}).status_code == 200
    hosted.post("/actions", headers=a, json={"origin": DEMO, "permission": "location", "action": "block",
                                             "before_setting": "allow", "after_setting": "block", "succeeded": True})
    da, db = hosted.get(f"/sites/{ENC}", headers=a).json(), hosted.get(f"/sites/{ENC}", headers=b).json()
    assert da["policy_findings"] and len(da["actions"]) == 1
    assert db["policy_findings"] == [] and db["actions"] == []


def test_device_token_works_for_data_but_not_for_the_account(hosted):
    a = bearer(token("user-a"))
    created = hosted.post("/me/tokens", headers=a, json={"label": "Extension"}).json()
    assert created["token"].startswith("cs_") and created["label"] == "Extension"
    dev = bearer(created["token"])
    audit(hosted, dev)
    assert [s["origin"] for s in hosted.get("/sites", headers=a).json()["sites"]] == [DEMO]
    assert hosted.post("/me/tokens", headers=dev, json={}).status_code == 403
    assert hosted.delete("/sites", headers=dev).status_code == 403
    listed = hosted.get("/me/tokens", headers=a).json()["tokens"]
    assert [t["id"] for t in listed] == [created["id"]] and listed[0]["last_used_at"]
    assert "token" not in listed[0]
    assert hosted.delete(f"/me/tokens/{created['id']}", headers=bearer(token("user-b"))).status_code == 404
    assert hosted.delete(f"/me/tokens/{created['id']}", headers=a).json() == {"deleted": 1}
    assert hosted.get("/sites", headers=dev).status_code == 401


def test_report_link(hosted):
    a = bearer(token("user-a"))
    audit(hosted, a)
    assert hosted.get(f"/sites/{ENC}/report-link", headers=bearer(token("user-b"))).status_code == 404
    url = hosted.get(f"/sites/{ENC}/report-link", headers=a).json()["url"]
    r = hosted.get(url)
    assert r.status_code == 200 and "<html" in r.text.lower()
    assert hosted.get(url.replace("sig=", "sig=x")).status_code == 401
    assert hosted.get(url.replace("u=user-a", "u=user-b")).status_code == 401


def test_delete_my_data(hosted):
    a, b = bearer(token("user-a")), bearer(token("user-b"))
    audit(hosted, a), audit(hosted, a, "https://example.com"), audit(hosted, b)
    dev = bearer(hosted.post("/me/tokens", headers=a, json={"label": "Scanner"}).json()["token"])
    assert hosted.delete("/me/data", headers=a).json() == {"deleted": 2}
    assert hosted.get("/sites", headers=a).json()["sites"] == []
    assert hosted.get("/sites", headers=dev).status_code == 401
    assert len(hosted.get("/sites", headers=b).json()["sites"]) == 1


def test_asymmetric_supabase_tokens(monkeypatch):
    """New Supabase projects sign with ES256; the backend checks against the project's public keys."""
    monkeypatch.delenv("SUPABASE_JWT_SECRET", raising=False)
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    private = ec.generate_private_key(ec.SECP256R1())
    app = create_app(":memory:")

    class FakeJwks:
        def get_signing_key_from_jwt(self, _t):
            return type("K", (), {"key": private.public_key()})()

    app.state.auth.jwks = FakeJwks()
    with TestClient(app) as c:
        t = token("user-es", key=private, alg="ES256", kid="k1")
        assert c.get("/me", headers=bearer(t)).json()["user_id"] == "user-es"
        other = ec.generate_private_key(ec.SECP256R1())
        assert c.get("/me", headers=bearer(token("x", key=other, alg="ES256", kid="k1"))).status_code == 401


def test_local_mode_needs_no_sign_in(client):
    assert client.get("/me").json() == {"user_id": "local", "email": None, "auth": "local"}


def test_old_local_database_is_migrated(tmp_path):
    path = tmp_path / "old.db"
    conn = sqlite3.connect(path)
    conn.executescript("""
        CREATE TABLE websites (origin TEXT PRIMARY KEY, display_name TEXT NOT NULL, purpose_profile TEXT NOT NULL,
          purpose_source TEXT NOT NULL, purpose_confidence TEXT NOT NULL, first_audited_at TEXT, last_audited_at TEXT);
        CREATE TABLE observations (id TEXT PRIMARY KEY, origin TEXT NOT NULL, permission TEXT NOT NULL,
          browser_setting TEXT NOT NULL, page_state TEXT NOT NULL, observed_at TEXT NOT NULL, source TEXT NOT NULL,
          provenance TEXT NOT NULL, seq INTEGER NOT NULL);
        INSERT INTO websites VALUES ('https://example.com', 'example.com', 'general', 'inferred', 'low',
          '2026-10-14T10:00:00Z', '2026-10-14T10:00:00Z');
        INSERT INTO observations VALUES ('o1', 'https://example.com', 'camera', 'allow', 'granted',
          '2026-10-14T10:00:00Z', 'popup_audit', 'observed', 7);
    """)
    conn.commit()
    conn.close()
    with TestClient(create_app(str(path))) as c:
        sites = c.get("/sites").json()["sites"]
        assert [s["origin"] for s in sites] == ["https://example.com"]
        assert sites[0]["latest_observations"][0]["permission"] == "camera"
        audit(c, {})  # new writes still work after the migration
