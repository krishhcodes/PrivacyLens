"""Business logic over the database. Routes in main.py stay thin."""
import uuid
from datetime import timedelta

from . import safebrowsing
from .db import Database, now_iso, parse_iso
from .models import ALL_PERMISSIONS
from .origin import display_name
from .rules import policy as policy_rules
from .rules.purpose import find_mismatches, infer_purpose
from .scoring import assess_risk

DEDUPE_WINDOW = timedelta(seconds=60)


class NotFound(Exception):
    pass


def _row(r) -> dict:
    return dict(r) if r is not None else None


# ---------- websites ----------
def get_website(db: Database, origin: str) -> dict | None:
    with db.tx() as c:
        return _row(c.execute("SELECT * FROM websites WHERE origin = ?", (origin,)).fetchone())


def ensure_website(c, origin: str, page_title: str | None, audited_at: str | None) -> tuple[dict, bool]:
    """Upsert a website. A user-chosen purpose is never overwritten by inference."""
    row = _row(c.execute("SELECT * FROM websites WHERE origin = ?", (origin,)).fetchone())
    profile, confidence = infer_purpose(origin, page_title)
    if row is None:
        c.execute(
            "INSERT INTO websites VALUES (?,?,?,?,?,?,?)",
            (origin, display_name(origin), profile, "inferred", confidence, audited_at, audited_at),
        )
        return _row(c.execute("SELECT * FROM websites WHERE origin = ?", (origin,)).fetchone()), True
    updates = {}
    if row["purpose_source"] == "inferred" and (profile != "general" or row["purpose_profile"] == "general"):
        updates.update(purpose_profile=profile, purpose_confidence=confidence)
    if audited_at:
        updates["last_audited_at"] = audited_at
        if not row["first_audited_at"]:
            updates["first_audited_at"] = audited_at
    if updates:
        sets = ", ".join(f"{k} = ?" for k in updates)
        c.execute(f"UPDATE websites SET {sets} WHERE origin = ?", (*updates.values(), origin))
    return _row(c.execute("SELECT * FROM websites WHERE origin = ?", (origin,)).fetchone()), False


# ---------- audits ----------
def save_audit(db: Database, origin: str, source: str, page_title: str | None, observations: list[dict]) -> dict:
    now = now_iso()
    # Integrity: provenance is decided by the server and never upgraded.
    provenance = "simulated" if source == "simulated" else "observed"
    saved = deduped = 0
    with db.tx() as c:
        site, created = ensure_website(c, origin, page_title, now)
        for o in observations:
            observed_at = o.get("observed_at") or now
            prov = "simulated" if (o.get("provenance") == "simulated" or provenance == "simulated") else "observed"
            prev = c.execute(
                "SELECT * FROM observations WHERE origin = ? AND permission = ? ORDER BY observed_at DESC, seq DESC LIMIT 1",
                (origin, o["permission"]),
            ).fetchone()
            if prev and prev["browser_setting"] == o["browser_setting"] and prev["page_state"] == o["page_state"] \
                    and prev["provenance"] == prov \
                    and abs(parse_iso(observed_at) - parse_iso(prev["observed_at"])) <= DEDUPE_WINDOW:
                deduped += 1
                continue
            c.execute(
                "INSERT INTO observations (id, origin, permission, browser_setting, page_state, observed_at, source, "
                "provenance, seq, setting_changed_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
                (str(uuid.uuid4()), origin, o["permission"], o["browser_setting"], o["page_state"],
                 observed_at, o.get("source") or source, prov, db.next_seq(), o.get("setting_changed_at")),
            )
            saved += 1
    return {
        "origin": origin, "created": created,
        "purpose_profile": site["purpose_profile"], "purpose_source": site["purpose_source"],
        "purpose_confidence": site["purpose_confidence"], "saved": saved, "deduplicated": deduped,
    }


def _observations(c, origin: str) -> list[dict]:
    return [dict(r) for r in c.execute(
        "SELECT id, permission, browser_setting, page_state, observed_at, source, provenance, setting_changed_at "
        "FROM observations WHERE origin = ? ORDER BY observed_at, seq", (origin,))]


def _latest(observations: list[dict]) -> dict[str, dict]:
    latest: dict[str, dict] = {}
    for o in observations:  # ordered oldest -> newest
        latest[o["permission"]] = o
    return latest


# ---------- actions ----------
def save_action(db: Database, origin: str, body: dict) -> dict:
    with db.tx() as c:
        ensure_website(c, origin, None, None)
        action = {
            "id": str(uuid.uuid4()),
            "permission": body["permission"],
            "action": body["action"],
            "before_setting": body["before_setting"],
            "after_setting": body["after_setting"],
            "succeeded": body["succeeded"],
            "error": body.get("error"),
            "acted_at": body.get("acted_at") or now_iso(),
        }
        c.execute(
            "INSERT INTO actions VALUES (?,?,?,?,?,?,?,?,?,?)",
            (action["id"], origin, action["permission"], action["action"], action["before_setting"],
             action["after_setting"], int(action["succeeded"]), action["error"], action["acted_at"], db.next_seq()),
        )
    return action


def _actions(c, origin: str) -> list[dict]:
    rows = [dict(r) for r in c.execute(
        "SELECT id, permission, action, before_setting, after_setting, succeeded, error, acted_at "
        "FROM actions WHERE origin = ? ORDER BY acted_at, seq", (origin,))]
    for r in rows:
        r["succeeded"] = bool(r["succeeded"])
    return rows


# ---------- policy ----------
def analyze_policy(db: Database, text: str, origin: str | None) -> list[dict]:
    findings = policy_rules.analyze(text, origin)
    if origin:
        with db.tx() as c:
            ensure_website(c, origin, None, None)
            # The latest analysis replaces earlier findings for this site.
            c.execute("DELETE FROM policy_findings WHERE origin = ?", (origin,))
            c.execute("INSERT OR REPLACE INTO policy_analyses VALUES (?,?,?)", (origin, now_iso(), len(text)))
            for f in findings:
                c.execute(
                    "INSERT INTO policy_findings VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                    (f["id"], origin, f["excerpt"], f["char_start"], f["char_end"], f["category"], f["rule_id"],
                     f["explanation"], f["recommendation"], f["evidence_type"], f["provenance"], db.next_seq()),
                )
    return findings


def _findings(c, origin: str) -> list[dict]:
    return [dict(r) for r in c.execute(
        "SELECT id, origin, excerpt, char_start, char_end, category, rule_id, explanation, recommendation, "
        "evidence_type, provenance FROM policy_findings WHERE origin = ? ORDER BY seq", (origin,))]


def _policy_analyzed(c, origin: str) -> bool:
    return c.execute("SELECT 1 FROM policy_analyses WHERE origin = ?", (origin,)).fetchone() is not None


# ---------- purpose ----------
def set_purpose(db: Database, origin: str, profile: str) -> dict:
    with db.tx() as c:
        if not c.execute("SELECT 1 FROM websites WHERE origin = ?", (origin,)).fetchone():
            raise NotFound(origin)
        c.execute(
            "UPDATE websites SET purpose_profile = ?, purpose_source = 'user', purpose_confidence = 'high' WHERE origin = ?",
            (profile, origin),
        )
    return {"origin": origin, "purpose_profile": profile, "purpose_source": "user", "purpose_confidence": "high"}


# ---------- read models ----------
def _assessment(site: dict, observations: list[dict], findings: list[dict], analyzed: bool, safety: dict) -> dict:
    latest = _latest(observations)
    mismatches = find_mismatches(site["purpose_profile"], latest)
    risk = assess_risk(site["purpose_profile"], latest, mismatches, findings, analyzed, safety)
    for m in mismatches:
        m.pop("_evidence", None)
    return {
        "origin": site["origin"],
        "purpose_profile": site["purpose_profile"],
        "purpose_source": site["purpose_source"],
        "mismatches": mismatches,
        "risk": risk,
        "safety": safety,
    }


def _summary(site: dict, observations: list[dict], assessment: dict) -> dict:
    latest = _latest(observations)
    risk = assessment["risk"]
    return {
        "origin": site["origin"],
        "display_name": site["display_name"],
        "purpose_profile": site["purpose_profile"],
        "purpose_source": site["purpose_source"],
        "purpose_confidence": site["purpose_confidence"],
        "first_audited_at": site["first_audited_at"],
        "last_audited_at": site["last_audited_at"],
        "latest_observations": [latest[p] for p in ALL_PERMISSIONS if p in latest],
        "band": risk["band"] if risk else None,
        "score": risk["score"] if risk else None,
        "completeness": risk["completeness"] if risk else None,
        "safety": assessment["safety"],
    }


def _load(c, origin: str):
    site = _row(c.execute("SELECT * FROM websites WHERE origin = ?", (origin,)).fetchone())
    if site is None:
        raise NotFound(origin)
    observations = _observations(c, origin)
    findings = _findings(c, origin)
    analyzed = _policy_analyzed(c, origin)
    return site, observations, findings, analyzed, safebrowsing.status(c, origin)


def list_sites(db: Database) -> list[dict]:
    with db.tx() as c:
        origins = [r[0] for r in c.execute(
            "SELECT origin FROM websites ORDER BY COALESCE(last_audited_at, '') DESC, origin")]
    safebrowsing.refresh(db, origins)  # network call outside the lock; cached 24 h
    with db.tx() as c:
        out = []
        for origin in origins:
            site, obs, findings, analyzed, safety = _load(c, origin)
            out.append(_summary(site, obs, _assessment(site, obs, findings, analyzed, safety)))
        return out


def site_detail(db: Database, origin: str) -> dict:
    safebrowsing.refresh(db, [origin])
    with db.tx() as c:
        site, obs, findings, analyzed, safety = _load(c, origin)
        assessment = _assessment(site, obs, findings, analyzed, safety)
        detail = _summary(site, obs, assessment)
        detail.update(
            observations=obs,
            actions=_actions(c, origin),
            policy_findings=findings,
            assessment=assessment if assessment["risk"] else None,
        )
        return detail


def site_assessment(db: Database, origin: str) -> dict:
    safebrowsing.refresh(db, [origin])
    with db.tx() as c:
        site, obs, findings, analyzed, safety = _load(c, origin)
        return _assessment(site, obs, findings, analyzed, safety)


def delete_site(db: Database, origin: str) -> int:
    with db.tx() as c:
        c.execute("DELETE FROM safety_checks WHERE origin = ?", (origin,))
        return c.execute("DELETE FROM websites WHERE origin = ?", (origin,)).rowcount


def delete_all(db: Database) -> int:
    with db.tx() as c:
        n = c.execute("SELECT COUNT(*) FROM websites").fetchone()[0]
        for t in ("policy_findings", "policy_analyses", "actions", "observations", "websites", "safety_checks"):
            c.execute(f"DELETE FROM {t}")
        return n
