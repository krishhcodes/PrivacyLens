"""Print-ready HTML report (§S5). Every dynamic value goes through html.escape."""
from html import escape

from .db import now_iso

PROVENANCE_LEGEND = [
    ("observed", "Read from Chrome or the page at the time shown."),
    ("policy_declared", "Stated explicitly in the privacy policy."),
    ("inferred", "Our inference from rules or keywords. Needs review."),
    ("simulated", "Demo data, not a real browser observation."),
]


def e(v) -> str:
    return escape("" if v is None else str(v), quote=True)


def badge(p: str) -> str:
    return f'<span class="badge b-{e(p)}">{e(p).upper()}</span>'


def render_report(d: dict) -> str:
    a = d.get("assessment") or {}
    risk = a.get("risk")
    simulated = any(o["provenance"] == "simulated" for o in d["observations"])
    latest = d["latest_observations"]

    rows = "".join(
        f"<tr><td>{e(o['permission'])}</td><td>{e(o['browser_setting']).upper()}</td><td>{e(o['page_state'])}</td>"
        f"<td class=mono>{e(o['observed_at'])}</td><td class=mono>{e(o.get('setting_changed_at') or '—')}</td><td>{badge(o['provenance'])}</td></tr>" for o in latest
    ) or '<tr><td colspan=6>No observations recorded.</td></tr>'

    actions = "".join(
        f"<tr><td class=mono>{e(x['acted_at'])}</td><td>{e(x['permission'])}</td><td>{e(x['action'])}</td>"
        f"<td><s>{e(x['before_setting']).upper()}</s> → {e(x['after_setting']).upper()}</td>"
        f"<td>{'yes' if x['succeeded'] else 'no: ' + e(x.get('error'))}</td></tr>" for x in d["actions"]
    ) or '<tr><td colspan=5>No actions taken.</td></tr>'

    mismatches = "".join(
        f"<li><b>{e(m['severity']).upper()}</b> · {e(m['permission'])} <span class=mono>{e(m['rule_id'])}</span> {badge(m['provenance'])}"
        f"<br>{e(m['explanation'])}<br><i>{e(m['limitation_note'])}</i></li>" for m in a.get("mismatches", [])
    ) or "<li>No purpose mismatches.</li>"

    findings = "".join(
        f"<li><b>{e(f['category'])}</b> <span class=mono>{e(f['rule_id'])}</span> {badge(f['provenance'])}"
        + (f"<blockquote>{e(f['excerpt'])}</blockquote>" if f["excerpt"] else "")
        + f"{e(f['explanation'])}<br><i>{e(f['recommendation'])}</i></li>" for f in d["policy_findings"]
    ) or "<li>No policy analyzed for this site.</li>"

    if risk:
        factor_rows = "".join(
            f"<tr><td>{e(f['label'])}</td><td class=num>{e(f['points'])}</td><td>{badge(f['provenance'])}</td>"
            f"<td>{e(f['explanation'])}</td></tr>" for f in risk["factors"]
        )
        missing = "".join(f"<li>{e(m)}</li>" for m in risk["missing"]) or "<li>Nothing missing.</li>"
        score_html = (
            f"<p class=score>{e(risk['band']).capitalize()} · {e(risk['score'])} / 100 · {e(risk['completeness']).capitalize()}</p>"
            f"<table><tr><th>Factor</th><th>Points</th><th>Provenance</th><th>Why</th></tr>{factor_rows}</table>"
            f"<h3>What we don't know</h3><ul>{missing}</ul><p class=note>{e(risk['disclaimer'])}</p>"
        )
    else:
        score_html = "<p>No score: audit the site first.</p>"

    legend = "".join(f"<li>{badge(p)} {e(t)}</li>" for p, t in PROVENANCE_LEGEND)
    banner = '<div class="sim">Demo data: this report contains simulated observations, not real browser data.</div>' if simulated else ""

    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ConsentScope report: {e(d['display_name'])}</title>
<style>
:root{{--paper:#FAF7F2;--rule:#E7E0D5;--ink:#1F1B16;--ink2:#5B544A}}
body{{font:14px/1.5 Inter,system-ui,sans-serif;color:var(--ink);background:var(--paper);max-width:860px;margin:24px auto;padding:0 16px}}
h1{{font-size:28px;margin:0}} h2{{font-size:20px;border-bottom:1px solid var(--rule);padding-bottom:4px;margin-top:28px}}
table{{width:100%;border-collapse:collapse}} td,th{{border-bottom:1px solid var(--rule);padding:6px;text-align:left;vertical-align:top}}
.mono{{font-family:'JetBrains Mono',monospace;font-size:12px}} .num{{text-align:right}} .note{{color:var(--ink2);font-size:12px}}
.badge{{font:11px 'JetBrains Mono',monospace;border:1px solid var(--ink);border-radius:4px;padding:0 4px}}
.b-policy_declared{{border-color:#4338CA;color:#4338CA}} .b-inferred{{border-color:#B45309;color:#B45309}}
.b-simulated{{border:1px dashed #475569;color:#475569;background:repeating-linear-gradient(45deg,#F1F5F9 0 4px,#fff 4px 8px)}}
.sim{{border:2px dashed #475569;padding:8px;margin:12px 0;background:repeating-linear-gradient(45deg,#F1F5F9 0 6px,#fff 6px 12px)}}
blockquote{{font-family:'JetBrains Mono',monospace;font-size:12px;border-left:3px solid var(--rule);margin:4px 0;padding-left:8px}}
.score{{font-size:20px;font-weight:600}} li{{margin-bottom:8px}}
@media print{{body{{background:#fff;margin:0}} @page{{size:A4;margin:16mm}}}}
</style></head><body>
<h1>ConsentScope audit report</h1>
<p><b>{e(d['origin'])}</b> · purpose: {e(d['purpose_profile'])} ({e(d['purpose_source'])}, {e(d['purpose_confidence'])})<br>
<span class=note>First audited {e(d['first_audited_at'])} · last audited {e(d['last_audited_at'])} · generated {e(now_iso())}</span></p>
{banner}
<h2>Permission ledger (latest)</h2>
<table><tr><th>Permission</th><th>Chrome setting</th><th>Page state</th><th>Observed</th><th>Rule last changed</th><th>Provenance</th></tr>{rows}</table>
<p class=note>Shows the Chrome setting and page state at the time of each audit. "Rule last changed" comes from the browser's own settings file and is only available from the local scanner.</p>
<h2>Actions taken</h2>
<table><tr><th>When</th><th>Permission</th><th>Action</th><th>Before → after (rechecked)</th><th>Succeeded</th></tr>{actions}</table>
<h2>Purpose mismatches</h2><ul>{mismatches}</ul>
<h2>Policy findings</h2><ul>{findings}</ul>
<h2>Score breakdown</h2>{score_html}
<h2>Provenance legend</h2><ul>{legend}</ul>
<h2>Limitations</h2>
<ul><li>Rules are deterministic keyword patterns and can miss things or misfire.</li>
<li>Mismatches are inferences from the site's assumed purpose, not evidence of data use.</li>
<li>No history of when access was granted is available from Chrome.</li></ul>
</body></html>"""
