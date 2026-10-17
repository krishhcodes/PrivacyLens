"""Indicative privacy-exposure score (§6.4). Every point traces to an observation or finding."""
from .db import now_iso

DISCLAIMER = "Indicative privacy-exposure assessment. Not a security rating, legal finding, or proof of misuse."

SENSITIVE = ("location", "camera", "microphone")
LABEL = {"location": "Location", "camera": "Camera", "microphone": "Microphone", "notifications": "Notifications"}
MISMATCH_POINTS = {"high": 20, "review": 8}
BASE_POINTS = {"location": 12, "camera": 12, "microphone": 12, "notifications": 4}
SHARE_RULES = {"SHARE-01", "SHARE-02"}
VAGUE_RETENTION_RULES = {"RET-01", "RET-02"}


def band_for(score: int) -> str:
    if score >= 75:
        return "high"
    if score >= 50:
        return "elevated"
    if score >= 25:
        return "moderate"
    return "low"


UNSAFE_POINTS = 50


def assess_risk(profile: str, latest: dict[str, dict], mismatches: list[dict],
                findings: list[dict], policy_analyzed: bool, safety: dict | None = None) -> dict | None:
    """latest: permission -> latest observation. Returns None if nothing was observed."""
    if not latest:
        return None
    factors: list[dict] = []
    by_perm = {m["permission"]: m for m in mismatches if m["severity"] in MISMATCH_POINTS}

    for permission in ("location", "camera", "microphone", "notifications"):
        obs = latest.get(permission)
        if not obs:
            continue
        active = obs["browser_setting"] == "allow" or obs["page_state"] == "granted"
        mm = by_perm.get(permission)
        if active and mm:
            factors.append({
                "factor_id": f"{mm['rule_id']}-{permission}",
                "label": f"{LABEL[permission]} mismatch ({profile.replace('_', ' ')})",
                "points": MISMATCH_POINTS[mm["severity"]],
                "provenance": "inferred",
                "evidence_refs": [obs["id"]],
                "explanation": f"{LABEL[permission]} is allowed for a site classified as {profile.replace('_', ' ')}. "
                               f"Replaces base {permission} points.",
            })
        elif active:
            factors.append({
                "factor_id": f"PERM-{permission.upper()}",
                "label": f"{LABEL[permission]} allowed",
                "points": BASE_POINTS[permission],
                "provenance": obs["provenance"],
                "evidence_refs": [obs["id"]],
                "explanation": f"{LABEL[permission]} access is allowed for this site.",
            })
        elif obs["browser_setting"] == "block":
            factors.append({
                "factor_id": f"PERM-{permission.upper()}",
                "label": f"{LABEL[permission]} blocked",
                "points": 0,
                "provenance": obs["provenance"],
                "evidence_refs": [obs["id"]],
                "explanation": f"{LABEL[permission]} is blocked. No points added.",
            })

    if safety and safety.get("status") == "unsafe":
        factors.append({
            "factor_id": "SAFE-BROWSING",
            "label": "Flagged by Google Safe Browsing",
            "points": UNSAFE_POINTS,
            "provenance": "observed",
            "evidence_refs": [],
            "explanation": "Google Safe Browsing lists this site for: " + ", ".join(safety.get("threats") or ["unsafe content"]) + ".",
        })

    missing: list[str] = []
    if policy_analyzed:
        sale = [f for f in findings if f["category"] == "sale"]
        share = [f for f in findings if f["rule_id"] in SHARE_RULES]
        retain = [f for f in findings if f["rule_id"] in VAGUE_RETENTION_RULES]
        no_delete = [f for f in findings if f["rule_id"] == "DEL-00"]
        if sale:
            factors.append(_policy_factor("POLICY-SALE", "Policy declares sale of data", 18, sale,
                                          "The policy describes selling or exchanging your data."))
        if share:
            factors.append(_policy_factor("POLICY-SHARE", "Policy declares third-party sharing", 12, share,
                                          "The policy states data is shared with third parties. Counted once, not per sentence."))
        if retain:
            factors.append(_policy_factor("POLICY-RETAIN", "Retention vague or indefinite", 8, retain,
                                          "The policy gives no concrete retention period."))
        if no_delete:
            factors.append(_policy_factor("POLICY-NO-DELETE", "No deletion mechanism found", 8, no_delete,
                                          "No sentence describes how to delete your data."))
    else:
        missing.append("Privacy policy not analyzed")
    for permission in ("location", "camera", "microphone", "notifications"):
        if permission not in latest:
            missing.append(f"{LABEL[permission]} not observed")

    score = min(100, sum(f["points"] for f in factors))
    return {
        "score": score,
        "band": band_for(score),
        "completeness": "full" if policy_analyzed else "partial",
        "factors": factors,
        "missing": missing,
        "assessed_at": now_iso(),
        "disclaimer": DISCLAIMER,
    }


def _policy_factor(factor_id, label, points, findings, explanation):
    explicit = any(f["provenance"] == "policy_declared" for f in findings)
    return {
        "factor_id": factor_id,
        "label": label,
        "points": points,
        "provenance": "policy_declared" if explicit else "inferred",
        "evidence_refs": [f["id"] for f in findings],
        "explanation": explanation,
    }
