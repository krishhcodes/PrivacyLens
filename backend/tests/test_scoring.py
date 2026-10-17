from app.rules.purpose import find_mismatches
from app.scoring import assess_risk, band_for


def obs(perm, setting, state="prompt", oid=None):
    return {"id": oid or f"o-{perm}", "permission": perm, "browser_setting": setting, "page_state": state, "provenance": "observed"}


def run(profile, latest, findings=(), analyzed=False):
    mm = find_mismatches(profile, latest)
    return mm, assess_risk(profile, latest, mm, list(findings), analyzed)


def test_bands():
    assert [band_for(x) for x in (0, 24, 25, 49, 50, 74, 75, 100)] == \
        ["low", "low", "moderate", "moderate", "elevated", "elevated", "high", "high"]


def test_mismatch_replaces_base_points():
    mm, r = run("calculator", {"location": obs("location", "allow", "granted")})
    assert [m["rule_id"] for m in mm] == ["MIS-01"]
    assert [(f["factor_id"], f["points"]) for f in r["factors"]] == [("MIS-01-location", 20)]
    assert r["score"] == 20 and r["band"] == "low" and r["completeness"] == "partial"
    assert "Privacy policy not analyzed" in r["missing"]


def test_ask_never_creates_mismatch():
    mm, r = run("calculator", {"camera": obs("camera", "ask", "prompt")})
    assert mm == [] and r["score"] == 0


def test_expected_permission_uses_base_points():
    mm, r = run("maps", {"location": obs("location", "allow", "granted")})
    assert mm == [] and r["score"] == 12


def test_no_observations_no_score():
    assert assess_risk("general", {}, [], [], False) is None


def test_policy_factors_counted_once_and_capped():
    latest = {p: obs(p, "allow", "granted") for p in ("location", "camera", "microphone", "notifications")}
    findings = [
        {"id": "a", "category": "sale", "rule_id": "SALE-01", "provenance": "policy_declared"},
        {"id": "b", "category": "sharing", "rule_id": "SHARE-01", "provenance": "policy_declared"},
        {"id": "c", "category": "sharing", "rule_id": "SHARE-02", "provenance": "policy_declared"},
        {"id": "d", "category": "retention", "rule_id": "RET-01", "provenance": "policy_declared"},
        {"id": "e", "category": "deletion", "rule_id": "DEL-00", "provenance": "inferred"},
    ]
    _, r = run("calculator", latest, findings, analyzed=True)
    ids = [f["factor_id"] for f in r["factors"]]
    assert ids.count("POLICY-SHARE") == 1
    share = next(f for f in r["factors"] if f["factor_id"] == "POLICY-SHARE")
    assert share["evidence_refs"] == ["b", "c"]
    assert r["score"] == 100 and r["band"] == "high" and r["completeness"] == "full"
