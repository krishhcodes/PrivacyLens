"""Google Safe Browsing integration, with the network call replaced by a fake."""
from app import safebrowsing

from .conftest import ledger

EVIL = "https://evil.example"
GOOD = "https://good.example"


def audit(client, origin):
    r = client.post("/audits", json={"origin": origin, "observations": ledger(location="ask", notif="ask")})
    assert r.status_code == 200


def site(client, origin):
    return next(s for s in client.get("/sites").json()["sites"] if s["origin"] == origin)


def test_without_key_nothing_is_sent(client, monkeypatch):
    monkeypatch.delenv("GOOGLE_SAFE_BROWSING_API_KEY", raising=False)
    monkeypatch.setattr(safebrowsing, "_lookup", lambda *a: (_ for _ in ()).throw(AssertionError("called")))
    audit(client, GOOD)
    assert site(client, GOOD)["safety"]["status"] == "not_checked"


def test_unsafe_site_flagged_scored_and_cached(client, monkeypatch):
    monkeypatch.setenv("GOOGLE_SAFE_BROWSING_API_KEY", "test-key")
    calls = []

    def fake(key, origins):
        calls.append(list(origins))
        return {o: (["SOCIAL_ENGINEERING"] if o == EVIL else []) for o in origins}

    monkeypatch.setattr(safebrowsing, "_lookup", fake)
    audit(client, EVIL)
    audit(client, GOOD)

    evil, good = site(client, EVIL), site(client, GOOD)
    assert evil["safety"]["status"] == "unsafe"
    assert evil["safety"]["threats"] == ["phishing / deceptive site"]
    assert good["safety"]["status"] == "safe"
    assert evil["score"] == good["score"] + safebrowsing_points()

    detail = client.get("/sites/https%3A%2F%2Fevil.example").json()
    assert any(f["factor_id"] == "SAFE-BROWSING" for f in detail["assessment"]["risk"]["factors"])
    assert detail["assessment"]["safety"]["status"] == "unsafe"

    # Cached: further reads don't call Google again.
    n = len(calls)
    site(client, EVIL)
    client.get("/sites/https%3A%2F%2Fevil.example")
    assert len(calls) == n


def test_local_and_unknown_origins_never_sent(client, monkeypatch):
    monkeypatch.setenv("GOOGLE_SAFE_BROWSING_API_KEY", "test-key")
    sent = []
    monkeypatch.setattr(safebrowsing, "_lookup", lambda k, o: sent.extend(o) or {x: [] for x in o})
    audit(client, "http://localhost:5500")
    assert site(client, "http://localhost:5500")["safety"]["status"] == "not_applicable"
    client.get("/sites/https%3A%2F%2Fnot-audited.example")  # 404, must not be looked up
    assert sent == []


def test_lookup_error_is_reported_not_raised(client, monkeypatch):
    monkeypatch.setenv("GOOGLE_SAFE_BROWSING_API_KEY", "test-key")

    def boom(*a):
        raise OSError("offline")

    monkeypatch.setattr(safebrowsing, "_lookup", boom)
    audit(client, GOOD)
    assert site(client, GOOD)["safety"]["status"] == "error"


def safebrowsing_points():
    from app.scoring import UNSAFE_POINTS
    return UNSAFE_POINTS
