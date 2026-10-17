"""Google Safe Browsing (v4 Lookup API) check per audited site.

Only the site's origin (e.g. https://example.com/) is sent to Google, and only when
GOOGLE_SAFE_BROWSING_API_KEY is set. Results are cached in the database for 24 h
(errors for 10 min) so the website's polling never hammers the API.
"""
import ipaddress
import json
import os
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

from .db import Database, now_iso, parse_iso
from .origin import hostname

ENDPOINT = "https://safebrowsing.googleapis.com/v4/threatMatches:find?key={key}"
TTL = timedelta(hours=24)
ERROR_TTL = timedelta(minutes=10)
THREAT_TYPES = ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"]
THREAT_LABEL = {
    "MALWARE": "malware",
    "SOCIAL_ENGINEERING": "phishing / deceptive site",
    "UNWANTED_SOFTWARE": "unwanted software",
    "POTENTIALLY_HARMFUL_APPLICATION": "harmful app",
}
BATCH = 500  # API limit per request


def api_key() -> str | None:
    return os.environ.get("GOOGLE_SAFE_BROWSING_API_KEY") or None


def applicable(origin: str) -> bool:
    """Local and private addresses are never sent to Google."""
    host = hostname(origin)
    if host in ("localhost",) or host.endswith(".localhost") or host.endswith(".local") or "." not in host:
        return False
    try:
        ip = ipaddress.ip_address(host.strip("[]"))
        return not (ip.is_private or ip.is_loopback or ip.is_link_local)
    except ValueError:
        return True


def _lookup(key: str, origins: list[str]) -> dict[str, list[str]]:
    """origin -> list of threat types (empty = no match). Raises on network/API errors."""
    body = {
        "client": {"clientId": "consentscope", "clientVersion": "1.0.0"},
        "threatInfo": {
            "threatTypes": THREAT_TYPES,
            "platformTypes": ["ANY_PLATFORM"],
            "threatEntryTypes": ["URL"],
            "threatEntries": [{"url": f"{o}/"} for o in origins],
        },
    }
    req = urllib.request.Request(ENDPOINT.format(key=key), data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=8) as r:
        data = json.load(r)
    out: dict[str, list[str]] = {o: [] for o in origins}
    for m in data.get("matches", []):
        url = m.get("threat", {}).get("url", "").rstrip("/")
        if url in out and m.get("threatType") not in out[url]:
            out[url].append(m.get("threatType"))
    return out


def _stale(row, now: datetime) -> bool:
    if row is None:
        return True
    age = now - parse_iso(row["checked_at"])
    return age > (ERROR_TTL if row["status"] == "error" else TTL)


def refresh(db: Database, origins: list[str]) -> None:
    """Check origins whose cached result is missing or expired. Never raises."""
    key = api_key()
    if not key:
        return
    now = datetime.now(timezone.utc)
    with db.tx() as c:
        rows = {r["origin"]: r for r in c.execute("SELECT * FROM safety_checks")}
        known = {r[0] for r in c.execute("SELECT origin FROM websites")}
    # Only audited sites are ever sent; never an arbitrary origin from a request path.
    todo = [o for o in origins if o in known and applicable(o) and _stale(rows.get(o), now)]
    for i in range(0, len(todo), BATCH):
        chunk = todo[i:i + BATCH]
        try:
            result = _lookup(key, chunk)
            records = [(o, "unsafe" if t else "safe", json.dumps(t)) for o, t in result.items()]
        except (urllib.error.URLError, OSError, ValueError) as e:
            records = [(o, "error", json.dumps([f"lookup failed: {getattr(e, 'code', '') or type(e).__name__}"])) for o in chunk]
        with db.tx() as c:
            for o, status, threats in records:
                c.execute("INSERT OR REPLACE INTO safety_checks VALUES (?,?,?,?)", (o, status, threats, now_iso()))


def status(c, origin: str) -> dict:
    """The safety record shown with a site."""
    if not applicable(origin):
        return {"status": "not_applicable", "threats": [], "checked_at": None}
    row = c.execute("SELECT * FROM safety_checks WHERE origin = ?", (origin,)).fetchone()
    if row is None:
        return {"status": "not_checked", "threats": [], "checked_at": None}
    threats = json.loads(row["threats"])
    if row["status"] == "unsafe":
        threats = [THREAT_LABEL.get(t, t.lower()) for t in threats]
    return {"status": row["status"], "threats": threats, "checked_at": row["checked_at"]}
