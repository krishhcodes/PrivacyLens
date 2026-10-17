import json
from pathlib import Path

import pytest

from app import models
from tests.conftest import DEMO, ENC, ledger

EXAMPLES = Path(__file__).resolve().parents[2] / "contracts" / "examples"
SAMPLE = (EXAMPLES / "sample_policy.txt").read_text()


@pytest.mark.parametrize("name,model", [
    ("sites_list.json", models.SitesList),
    ("site_detail.json", models.SiteDetail),
    ("assessment_response.json", models.SiteAssessment),
    ("assessment_after_policy.json", models.SiteAssessment),
    ("policy_analyze_response.json", models.PolicyAnalyzeResponse),
    ("audits_response.json", models.AuditResponse),
    ("audits_request.json", models.AuditRequest),
    ("actions_request.json", models.ActionRequest),
    ("actions_response.json", models.PermissionAction),
    ("policy_analyze_request.json", models.PolicyAnalyzeRequest),
    ("purpose_request.json", models.PurposeUpdateRequest),
    ("purpose_response.json", models.PurposeUpdateResponse),
    ("health.json", models.Health),
])
def test_contract_examples_validate(name, model):
    model.model_validate(json.loads((EXAMPLES / name).read_text()))


def test_example_scores_match_their_factors():
    for name in ("assessment_response.json", "assessment_after_policy.json"):
        risk = json.loads((EXAMPLES / name).read_text())["risk"]
        assert risk["score"] == sum(f["points"] for f in risk["factors"]), name


def test_health(client):
    assert client.get("/health").json() == {"status": "ok", "version": "1.0.0"}


def test_audit_infers_purpose_and_lists_site(demo):
    sites = demo.get("/sites").json()["sites"]
    assert len(sites) == 1
    s = sites[0]
    assert s["origin"] == DEMO and s["purpose_profile"] == "calculator" and s["purpose_confidence"] == "medium"
    assert s["score"] == 20 and s["band"] == "low" and s["completeness"] == "partial"
    assert [o["permission"] for o in s["latest_observations"]] == ["location", "camera", "microphone", "notifications"]


def test_audit_dedupes_within_60s(client):
    body = {"origin": DEMO, "observations": ledger(at="2026-10-14T06:12:07Z")}
    assert client.post("/audits", json=body).json()["saved"] == 4
    body["observations"] = ledger(at="2026-10-14T06:12:50Z")
    assert client.post("/audits", json=body).json()["deduplicated"] == 4
    body["observations"] = ledger(at="2026-10-14T06:14:00Z")
    assert client.post("/audits", json=body).json()["saved"] == 4


def test_audit_rejects_bad_origin(client):
    r = client.post("/audits", json={"origin": "chrome://extensions", "observations": ledger()})
    assert r.status_code == 400 and "Non-http(s)" in r.json()["detail"]


def test_client_cannot_upgrade_provenance(client):
    obs = ledger()
    for o in obs:
        o["provenance"] = "policy_declared"
    client.post("/audits", json={"origin": DEMO, "source": "simulated", "observations": obs})
    detail = client.get(f"/sites/{ENC}").json()
    assert {o["provenance"] for o in detail["observations"]} == {"simulated"}


def test_full_demo_flow(demo):
    # Policy raises the score with separate, non-duplicated factors
    r = demo.post("/policy/analyze", json={"text": SAMPLE, "origin": DEMO})
    assert r.status_code == 200 and r.json()["finding_count"] >= 4
    a = demo.get(f"/sites/{ENC}/assessment").json()
    assert a["risk"]["score"] == 40 and a["risk"]["band"] == "moderate" and a["risk"]["completeness"] == "full"
    assert {"MIS-01-location", "POLICY-SHARE", "POLICY-RETAIN"} <= {f["factor_id"] for f in a["risk"]["factors"]}

    # Changing purpose to maps downgrades the location finding
    assert demo.put(f"/sites/{ENC}/purpose", json={"purpose_profile": "maps"}).json()["purpose_source"] == "user"
    a = demo.get(f"/sites/{ENC}/assessment").json()
    assert a["mismatches"] == [] and a["purpose_source"] == "user"
    # ...and a later audit never overwrites the user's choice
    demo.post("/audits", json={"origin": DEMO, "page_title": "PocketCalc", "observations": ledger(at="2026-01-01T00:00:00Z")})
    assert demo.get(f"/sites/{ENC}").json()["purpose_profile"] == "maps"
    demo.put(f"/sites/{ENC}/purpose", json={"purpose_profile": "calculator"})

    # Blocking location removes the mismatch and drops the score
    act = demo.post("/actions", json={"origin": DEMO, "permission": "location", "action": "block",
                                      "before_setting": "allow", "after_setting": "block", "succeeded": True}).json()
    assert act["id"] and act["after_setting"] == "block"
    demo.post("/audits", json={"origin": DEMO, "source": "post_action_recheck", "observations": ledger(location="block", loc_state="denied")})
    a = demo.get(f"/sites/{ENC}/assessment").json()
    assert a["mismatches"] == [] and a["risk"]["score"] == 20

    d = demo.get(f"/sites/{ENC}").json()
    assert len(d["actions"]) == 1 and d["policy_findings"] and d["assessment"]["risk"]["score"] == 20


def test_unencoded_origin_path_also_works(demo):
    assert demo.get("/sites/http://localhost:5500").status_code == 200
    assert demo.get("/sites/http://localhost:5500/assessment").status_code == 200


def test_unknown_site_404(client):
    assert client.get("/sites/https%3A%2F%2Fnope.example").status_code == 404
    assert client.get("/sites/https%3A%2F%2Fnope.example/assessment").status_code == 404


def test_policy_empty_text_400(client):
    r = client.post("/policy/analyze", json={"text": "   "})
    assert r.status_code == 400 and r.json()["detail"].startswith("Paste at least one sentence")


def test_policy_without_origin_not_stored(client):
    r = client.post("/policy/analyze", json={"text": SAMPLE}).json()
    assert r["origin"] is None and r["finding_count"] > 0
    assert client.get("/sites").json()["sites"] == []


def test_report_escapes_excerpts(demo):
    demo.post("/policy/analyze", json={"text": "<script>alert(1)</script> We sell your data.", "origin": DEMO})
    html = demo.get(f"/sites/{ENC}/report").text
    assert "<script>alert(1)</script>" not in html
    assert "&lt;script&gt;alert(1)&lt;/script&gt;" in html


def test_report_labels_simulated(client):
    client.post("/audits", json={"origin": DEMO, "source": "simulated", "observations": ledger()})
    assert "simulated observations" in client.get(f"/sites/{ENC}/report").text


def test_delete_site_and_all(demo):
    assert demo.delete(f"/sites/{ENC}").json() == {"deleted": 1}
    assert demo.get("/sites").json()["sites"] == []
    assert demo.delete(f"/sites/{ENC}").status_code == 404
    demo.post("/audits", json={"origin": "https://a.example", "observations": ledger()})
    demo.post("/audits", json={"origin": "https://b.example", "observations": ledger()})
    assert demo.delete("/sites").json() == {"deleted": 2}


def test_cors_allows_extension_and_localhost_only(client):
    ext = "chrome-extension://" + "a" * 32
    h = client.options("/health", headers={"Origin": ext, "Access-Control-Request-Method": "GET"}).headers
    assert h.get("access-control-allow-origin") == ext
    h = client.get("/health", headers={"Origin": "https://evil.example"}).headers
    assert "access-control-allow-origin" not in h


def test_cors_allows_configured_website(monkeypatch):
    from fastapi.testclient import TestClient
    from app.main import create_app
    monkeypatch.setenv("CONSENTSCOPE_ALLOWED_ORIGINS", "https://consentscope.vercel.app/, https://other.example")
    with TestClient(create_app(":memory:")) as c:
        h = c.get("/health", headers={"Origin": "https://consentscope.vercel.app"}).headers
        assert h.get("access-control-allow-origin") == "https://consentscope.vercel.app"
        assert "access-control-allow-origin" not in c.get("/health", headers={"Origin": "https://evil.example"}).headers


def test_local_scan_upload_keeps_change_time(client):
    obs = [{"permission": "location", "browser_setting": "allow", "page_state": "not_checked",
            "setting_changed_at": "2024-10-03T00:00:00Z"}]
    r = client.post("/audits", json={"origin": "https://maps.example.com", "source": "local_scan", "observations": obs})
    assert r.status_code == 200
    d = client.get("/sites/https%3A%2F%2Fmaps.example.com").json()
    o = d["latest_observations"][0]
    assert o["setting_changed_at"] == "2024-10-03T00:00:00Z" and o["provenance"] == "observed" and o["source"] == "local_scan"
    assert d["purpose_profile"] == "maps" and d["score"] == 12
    assert "2024-10-03T00:00:00Z" in client.get("/sites/https%3A%2F%2Fmaps.example.com/report").text


def test_extra_permission_types_listed_but_not_scored(client):
    obs = [{"permission": "location", "browser_setting": "ask", "page_state": "not_checked"},
           {"permission": "popups", "browser_setting": "allow", "page_state": "not_checked"},
           {"permission": "usb", "browser_setting": "allow", "page_state": "not_checked"}]
    assert client.post("/audits", json={"origin": "https://x.example", "source": "local_scan", "observations": obs}).status_code == 200
    s = client.get("/sites").json()["sites"][0]
    assert [o["permission"] for o in s["latest_observations"]] == ["location", "popups", "usb"]
    assert s["score"] == 0
    bad = client.post("/actions", json={"origin": "https://x.example", "permission": "usb", "action": "block",
                                        "before_setting": "allow", "after_setting": "block", "succeeded": True})
    assert bad.status_code == 422
