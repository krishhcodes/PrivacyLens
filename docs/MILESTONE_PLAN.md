# ConsentScope — 4-Hour Milestone Plan (vertical slices)

**Principle:** every slice ends with a demo that works end to end. If the clock stops at any slice boundary, we present what exists. Each slice adds something real; nothing is left half-wired.

**Team split (2–4 people):**
- **FE** — extension (popup + dashboard). Two people if available: one on the popup, one on the dashboard.
- **BE** — FastAPI backend, rules and report. A second BE person can own `demo-site/` and the tests.

**Parallelism trick:** at 0:20 the contract (`contracts/examples/*.json`) is frozen. FE builds against those example files as mocks behind a `USE_MOCKS` flag, so neither side waits for the other.

| Slice | Clock | Fundamental question answered | Demo at end of slice |
|---|---|---|---|
| S0 | 0:00–0:20 | Can we run it? | Extension loads, popup shows the domain, backend `/health` is green |
| **S1** | 0:20–1:05 | **What can this site access?** | Live ledger on the demo site |
| **S2** | 1:05–1:45 | **Can I take it back?** | Block / Reset, verified, with Undo |
| S3 | 1:45–2:30 | What does the policy say? | Pasted policy → highlighted red flags |
| S4 | 2:30–3:10 | Should I worry, and why? | Mismatch cards and an explainable score |
| S5 | 3:10–3:35 | Can I share it? | Exported report |
| S6 | 3:35–4:00 | — | Freeze, rehearse, fix. **No new features after 3:35.** |

---

## S0 — Feasibility and skeleton (0:00–0:20)
**Goal:** both apps run, and the contract is agreed.
- **FE:** Vite React TS multi-page app; `public/manifest.json` (MV3, permissions as specified in the architecture doc); popup shows the active tab's origin; dashboard.html loads; onboarding opens on install.
- **BE:** FastAPI app with `/health`, CORS, SQLite init, and a `contracts/examples` validated by the Pydantic models.
- **Demo-site:** `demo-site/index.html` "PocketCalc" with a calculator and a "Find tax rate near me" button that calls `navigator.geolocation`.
- **Spikes S-1 to S-4** (10 min, run by whoever finishes first). Record the results in TECHNICAL_ARCHITECTURE §9.
- **Acceptance:** loading the unpacked extension raises no errors, the popup shows `http://localhost:5500`, and `curl localhost:8000/health` returns ok.
- **Fallback:** if the Vite multi-page build fights you for more than 10 minutes, ship plain HTML + TS for the popup and keep React for the dashboard only.

## S1 — Site Permission Ledger (0:20–1:05) ★ most fundamental
**User-visible result:** open the popup on any normal site and see the four rows, with a Chrome setting, a page state, a timestamp and provenance.
- **FE tasks (in order):**
  1. `lib/origin.ts`: normalize a URL to an origin, plus the contentSettings pattern builder.
  2. `lib/chromeSettings.ts`: read all four types in parallel. Map errors to `unsupported` or `unknown`.
  3. `lib/pageState.ts`: `scripting.executeScript` running a fixed function that queries the four permissions; failures map to `unavailable`.
  4. The `Ledger` component plus states (loading, can't-inspect, contacts "not tracked").
  5. Cache the ledger in `chrome.storage.local`; POST `/audits` fire-and-forget, with an offline dot if it fails.
- **BE tasks:** `POST /audits` (upsert Website, insert observations, dedupe within 60 s), `GET /sites`, `GET /sites/{origin}`. Purpose inference v0 from the hostname.
- **FE (dashboard):** Sites table reading `GET /sites`, falling back to `storage.local` when offline.
- **Acceptance:** on the demo site after granting location, the location row shows `ALLOWED / granted`. On a fresh site the rows show `ASK / prompt` and nothing reads "granted". On `chrome://extensions` the can't-inspect state appears. Stopping the backend leaves the popup working.
- **Tests:** pytest for origin normalization (`www`, ports, trailing slashes, bad input) and audit dedupe. Manual checks: fresh site, granted site, chrome:// page, backend down.
- **DoD:** you can present "here's what this site holds" with real browser data.

## S2 — Take control (1:05–1:45)
**User-visible result:** Block or Reset to Ask from the ledger, with confirmation, an automatic recheck, a success toast with Undo, and an action log.
- **FE:** confirm dialog → `contentSettings.<type>.set` → re-read the setting and page state → struck-through before → after → toast with a 10 s Undo (sets the previous value) → POST `/actions` with the *rechecked* after value. A "Reload page" prompt appears if the page state hasn't flipped (spike S-2). An "Open in Chrome settings ↗" link on each row. **Stretch:** a "Check a URL" box on the dashboard, using the same reader without page state, labelled "Chrome setting only".
- **BE:** `POST /actions`; include actions in `GET /sites/{origin}`.
- **Acceptance:** Block location → the row shows BLOCKED (rechecked); the demo-site button now errors as denied; Undo restores ALLOWED; Reset → ASK. A failed `set` shows the red toast and claims no change. Actions appear in Site detail.
- **Tests:** pattern builder unit tests; manual block / reset / undo / failure (an invalid pattern forced in dev).
- **DoD:** the full "discover → take control" story is demoable. **This is the minimum viable demo.**

## S3 — Policy Red-Flag Analyzer (1:45–2:30)
**User-visible result:** paste a policy → sentence highlights and finding cards with evidence.
- **BE:** `rules/policy.py`: sentence splitter, around 20 rules, document-level "no deletion statement" rule; `POST /policy/analyze`; store the findings against the origin when one is given. Sample policy in `contracts/examples/sample_policy.txt`.
- **FE:** Policy Analyzer page: textarea, Analyze button, highlighted text from the offsets, finding cards, the empty, no-findings and offline states. The popup link "Analyze this site's policy" opens the dashboard with the origin preselected. **Stretch:** "Use current tab's text" (executeScript returns `innerText`, truncated to 200 kB).
- **Acceptance:** the sample policy yields at least one finding in each of collection, sharing, retention and deletion, each with the exact sentence; hedged sentences are tagged "needs review"; a `<script>` inside the pasted text renders as literal text.
- **Tests:** pytest per category with positive and negative cases, e.g. "We do not sell your data" must **not** fire `sale` as explicit; the negation guard regex is `(do not|never|don't) sell`.
- **DoD:** the policy story is demoable independently of permissions.

## S4 — Purpose mismatch and explainable score (2:30–3:10)
**User-visible result:** a calculator with location access shows a "High — review" inference card, and the score breakdown explains every point.
- **BE:** `rules/purpose.py` (matrix), `scoring.py` (weights, de-duplication, partial completeness), `GET /sites/{origin}/assessment`, `PUT /sites/{origin}/purpose`.
- **FE:** mismatch cards (inline in the ledger plus Site detail); purpose select (user correction → refetch); risk chip in the popup; breakdown table with evidence links and the "What we don't know" list.
- **Acceptance:** demo site, location allowed, no policy → mismatch MIS-01, score ≈ 20, Low, **Partial**. After analyzing the sample policy → the score rises with separate, non-duplicated policy factors. Changing the purpose to "maps" downgrades the location finding. Blocking location → the mismatch disappears and the score drops.
- **Tests:** pytest for scoring de-duplication (a mismatch replaces base points), the missing-policy path, the no-observations path (no score), and the cap at 100.
- **DoD:** every number on screen can be traced to a rule or observation.

## S5 — Audit report (3:10–3:35)
**User-visible result:** "Export report" opens a printable page; Print → PDF.
- **BE:** `GET /sites/{origin}/report` renders HTML through an escaped template: identity and date, ledger with timestamps, actions before → after, mismatches, policy findings with excerpts, score breakdown, provenance legend, limitations. `DELETE` endpoints.
- **FE:** Export button (opens the report URL in a new tab), Settings → Clear site / Clear all (backend and `storage.local`).
- **Acceptance:** the report contains only recorded data; simulated rows are visibly labelled; it prints cleanly on A4; clearing removes the site from the dashboard.
- **Fallback:** if the backend report breaks, use the dashboard's Site detail with `window.print()` and print CSS.

## S6 — Freeze and rehearse (3:35–4:00)
Run DEMO_PLAN twice end to end, fix only bugs that break the demo, record a 60-s backup screen capture, and write the README run commands.

## Optional (only if S5 is done by 3:30): Data exposure map
A static SVG of data categories → site → named third parties (from policy findings only). Every edge is labelled `POLICY` or `INFERRED`, never "observed flow".

---

## Cut order if behind schedule
1. Data exposure map
2. "Use current tab's text" (paste stays)
3. Manual URL audit
4. Backend report → dashboard print view
5. Purpose correction UI (keep the inferred purpose plus its label)
6. **Never cut:** S1 ledger, S2 controls, policy paste analyzer, provenance labels.

## Risk register
| # | Risk | Likelihood | Impact | Mitigation | Validation | Cut first |
|---|---|---|---|---|---|---|
| R1 | contentSettings doesn't reflect prompt grants (S-1) | Med | High | Show both columns; page state is the fallback signal | Spike at 0:10 | — |
| R2 | Reset to Ask isn't seen until the page reloads | High | Med | "Reload the page" CTA and recheck after reload | Spike S-2 | — |
| R3 | No Chrome-wide grant event exists | Certain | Med | No false claim; recheck on popup open and after actions | Docs | Background monitoring (already out) |
| R4 | CORS or extension-ID issues FE↔BE | Med | Med | `key` in the manifest for a stable ID; dev CORS on localhost | S0 health call from the popup | — |
| R5 | Policy false positives | High | Med | Negation guards, "needs review" tier, no-findings disclaimer | Negative tests | Vague-language rules |
| R6 | Purpose misclassification | Med | Med | Shown as inferred with confidence, user-editable | Manual | Correction UI |
| R7 | Camera/mic prompts flaky on the demo laptop | Med | Low | Location-only demo | Spike S-4 | Camera demo |
| R8 | Time sunk into styling | High | High | Tokens fixed in UX spec; no polish until S6 | Clock check at each slice | Map, animations |
| R9 | Vite multi-page MV3 build issues | Low | High | Hand-written manifest, no CRX plugin; plain-HTML popup fallback | S0 | — |
| R10 | Backend dies mid-demo | Low | Med | Ledger and controls are backend-independent; offline states | Kill the backend in rehearsal | — |
