# ConsentScope — Technical Architecture

## 1. Repository findings and stack

No repository was supplied, so this plan assumes a greenfield monorepo. If you already have a scaffold, keep it and map these modules onto it.

```
consentscope/
  contracts/        API contract (JSON Schema + example payloads) — frozen at 0:20
  extension/        FRONTEND: Chrome MV3 extension (popup + dashboard page)
  backend/          BACKEND: local API (analysis, scoring, persistence, report)
  demo-site/        PocketCalc test page (static HTML)
  docs/             these plans
```

| Layer | Choice | Why |
|---|---|---|
| Extension | Vite + React + TypeScript + Tailwind, multi-page build (popup.html, dashboard.html, service worker), with a hand-written `manifest.json` in `public/` | Fast and familiar. Avoids plugin magic, so there is no extension-bundler risk. shadcn/ui is optional: copy only Button, Dialog, Badge and Tabs if time allows. Lucide icons. |
| Backend | Python FastAPI + Pydantic + SQLite (stdlib `sqlite3`) | Regex rules are trivial to write. Auto-generated `/docs` is a useful contract-testing tool and a demo bonus. No ORM needed. |
| Demo site | Plain HTML served by `python -m http.server 5500` | Deterministic, with no build step. |

**The frontend/backend split rule:** the backend owns *judgement* (policy rules, purpose profiles, scoring, reports, history). The extension owns *browser truth* (reading and changing Chrome settings, page-context queries) and must render the ledger and run controls **with no backend**. If the backend is unreachable, the analysis panels show "Analysis service offline — start backend" and the ledger and controls keep working.

## 2. Chrome API feasibility matrix

| Feature | API / approach | What is genuinely supported | Limitations | MVP implementation |
|---|---|---|---|---|
| Read the per-site browser setting | `chrome.contentSettings.<type>.get({primaryUrl})` | Types include `location`, `camera`, `microphone`, `notifications` (plus popups, javascript, cookies, etc.). Returns `allow` / `block` / `ask`. | Returns the *effective* setting for the URL pattern. It does **not** say when access was granted and provides no history. *Spike S-1:* confirm it reflects grants the user made through the page prompt. | Read 4 types for the active tab origin on popup open. |
| Change a setting | `chrome.contentSettings.<type>.set({primaryPattern, setting})` | `allow`, `block`, `ask` (for these types) | Rules set by the extension take precedence over the user's own Chrome setting, and persist until the extension clears them. `clear()` removes **all** rules the extension set, not just one site's. | Block = `set('block')`. Reset = `set('ask')`. Undo = `set(previous)`. Pattern: `scheme://host:port/*` or `scheme://host/*`. |
| Page-context permission state | `navigator.permissions.query({name})` run in the tab through `chrome.scripting.executeScript` | `geolocation`, `camera`, `microphone`, `notifications` → `granted` / `denied` / `prompt` | Needs a script-injectable tab: no `chrome://` pages and no Web Store pages. Firefox and Safari differ (out of scope). | Inject once per audit using `activeTab`. |
| Observe changes | `PermissionStatus` `change` event inside the page | Fires when that origin's state changes while the page is open | Only while our script is alive in that tab. There is **no** Chrome-wide event for website permission grants. `chrome.permissions.onAdded` is for the extension's *own* permissions, which is unrelated. | Popup re-queries on open and after every action. Optional: a content script on the demo origin only posts `change` events (stretch). |
| Persistence | `chrome.storage.local` plus the backend SQLite | Local, offline | We record only what we observed, and when. | Extension caches the last ledger per origin. Backend stores audits, actions and findings. |
| Current tab URL | `activeTab` (granted when the user clicks the action) | URL of the active tab | Only on user gesture | Popup reads `chrome.tabs.query({active, currentWindow})`. |
| Manual URL audit | `contentSettings.get` with any URL | Works without visiting | No page state, no history | Labelled "Chrome setting only". |
| Policy text from page | `scripting.executeScript` returning `document.body.innerText` | Text of the active tab | Needs the tab to be open and user-triggered | "Use this tab's text" button. Paste is the fallback. |
| Deep link to Chrome UI | Open `chrome://settings/content/siteDetails?site=<origin>` with `chrome.tabs.create` | Extensions can open chrome:// URLs with tabs.create | Cannot script that page | "Open in Chrome settings" link on every row. |
| Contacts / USB / Bluetooth etc. | — | Not a contentSettings type we rely on | — | Shown as "Not tracked" with an explanation. Never shown as "safe". |

### Manifest permissions (least privilege)

- `permissions`: `contentSettings`, `activeTab`, `scripting`, `storage`
- `host_permissions`: `http://localhost:8000/*` (backend only)
- **Not requested:** `<all_urls>`, `tabs`, `history`, `webRequest`
- **Install warning** to explain in onboarding: Chrome will say the extension can *change your settings that control websites' access to features such as cookies, JavaScript, plugins, geolocation, microphone, camera etc.*
- **Future (documented, not built):** background monitoring would need `optional_host_permissions: ["<all_urls>"]` requested at runtime, with an opt-in screen. That raises the permission warning to "read and change all your data on all websites," which is why it is out of scope for the MVP.

**Incognito:** the manifest uses the default `"incognito": "spanning"`. The extension does not run in incognito unless the user enables it, and we never persist records from incognito tabs (check `tab.incognito`).

## 3. Contexts and message flow

```
 [Popup (React)] ──activeTab──► chrome.tabs / contentSettings.get ──► Ledger rows
       │                       chrome.scripting.executeScript ──► navigator.permissions.query (page)
       │ Block/Reset ─► contentSettings.set ─► re-get + re-query ─► recheck
       │
       ├─► chrome.storage.local (cache: last ledger, actions)
       └─► fetch localhost:8000  POST /audits, POST /actions, GET /sites/{origin}/assessment
                                          │
 [Dashboard page (React)] ─────────────────┤ POST /policy/analyze, PUT /sites/{origin}/purpose,
                                          │ GET /sites, GET /sites/{origin}/report (HTML)
 [Backend FastAPI] ── rules engine ── scoring ── SQLite (consentscope.db)
```

There is no service-worker logic in the MVP. The popup and dashboard call Chrome APIs directly, which removes an entire class of messaging bugs. The service worker exists only for `chrome.runtime.onInstalled`, which opens the onboarding page.

## 4. Data models (shared contract)

Enums:
- `PermissionType`: `location | camera | microphone | notifications`
- `BrowserSetting`: `allow | block | ask | unsupported | unknown`
- `PageState`: `granted | denied | prompt | unavailable | not_checked`
- `Provenance`: `observed | policy_declared | inferred | simulated | unknown`
- `Severity`: `info | review | high`
- `PolicyCategory`: `collection | sharing | sale | retention | deletion | vague`

**Website**
| Field | Type | Notes |
|---|---|---|
| origin | string (PK) | Normalized `scheme://host[:port]`, lowercase, default ports dropped. `www.` is *kept*, because exact-origin separation matters. |
| display_name | string | Host |
| purpose_profile | string | e.g. `calculator`, `video_meeting`, `maps`, `weather`, `general` |
| purpose_source | `inferred \| user` | A user correction always wins. |
| purpose_confidence | `low \| medium \| high` | |
| first_audited_at, last_audited_at | ISO-8601 UTC | Time of *our* audits, never "time granted". |

**PermissionObservation**
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| origin, permission | | |
| browser_setting | BrowserSetting | from contentSettings |
| page_state | PageState | from the Permissions API, or `not_checked` |
| observed_at | ISO-8601 | |
| source | `popup_audit \| manual_url \| post_action_recheck \| simulated` | |
| provenance | `observed` or `simulated` | Never anything else. |

**PermissionAction**
| Field | Type |
|---|---|
| id, origin, permission | |
| action | `block \| reset_ask \| undo` |
| before_setting, after_setting | BrowserSetting (`after` is the *rechecked* value, not the requested value) |
| succeeded | bool, plus `error` string |
| acted_at | ISO-8601 |

**PolicyFinding**
| Field | Type | Notes |
|---|---|---|
| id, origin (nullable) | | Pasted text may have no site. |
| excerpt | string | The exact sentence, rendered as **text only**. |
| char_start, char_end | int | For highlighting |
| category | PolicyCategory | |
| rule_id | string | e.g. `SHARE-03` |
| explanation, recommendation | string | |
| evidence_type | `explicit_statement \| keyword_match_review` | |
| provenance | `policy_declared` (explicit) or `inferred` (keyword) | |

**RiskAssessment**
| Field | Type |
|---|---|
| origin, score (0–100), band (`low \| moderate \| elevated \| high`), completeness (`full \| partial`) | |
| factors[] | `{factor_id, label, points, provenance, evidence_refs[], explanation}` |
| missing[] | strings, e.g. "Privacy policy not analyzed" |
| assessed_at | ISO-8601 |

**Integrity rules:** an observation's provenance can never be upgraded. Simulated records carry `simulated` everywhere, including in the report. Deduplicate observations when the same origin, permission, setting and state are seen within 60 s.

## 5. Backend API

| Method | Path | Purpose | Slice |
|---|---|---|---|
| GET | /health | Liveness check, used for the "backend online" pill | S0 |
| POST | /audits | Save ledger observations for an origin. Upserts the Website and infers its purpose. | S1 |
| GET | /sites, /sites/{origin} | Audited sites with their latest ledger | S1 |
| POST | /actions | Log a block / reset / undo with before and after values | S2 |
| POST | /policy/analyze | `{text, origin?}` → findings[] | S3 |
| PUT | /sites/{origin}/purpose | User correction of the purpose profile | S4 |
| GET | /sites/{origin}/assessment | Mismatches plus the risk assessment | S4 |
| GET | /sites/{origin}/report | Print-ready HTML report | S5 |
| DELETE | /sites/{origin}, /sites | Clear data | S5 |

CORS allows only the `chrome-extension://<id>` origin (fixed with a `key` in the manifest during dev, or `*` on localhost in dev only, which is acceptable for the hackathon and noted).

## 6. Rules engines (backend)

### 6.1 Purpose inference
Inference uses a hostname and page-title keyword map (for example `calc`, `calculator`, `convert` → calculator; `meet`, `zoom`, `call` → video_meeting; `map`, `nav` → maps; `weather` → weather; otherwise general). Confidence is `medium` on a keyword hit and `low` otherwise. The demo site is labelled "calculator" through its hostname and title. The user can override this in the UI.

### 6.2 Purpose–permission matrix
| Profile | location | camera | microphone | notifications |
|---|---|---|---|---|
| calculator / text tool | **high** (MIS-01) | **high** | **high** | review |
| video_meeting | review | expected | expected | info |
| maps | expected | review | review | info |
| weather | expected, with a note that manual entry is an alternative (MIS-04) | review | review | info |
| general | review | review | review | info |

A finding is created only when `browser_setting == allow` or `page_state == granted`. An "ask" setting never creates a mismatch. Each finding states: *"Inference: based on the site's assumed purpose, not on observed data use."*

### 6.3 Policy rules (sentence-level)
Text is split into sentences with a regex (`(?<=[.!?])\s+`, plus newlines). Each rule is a phrase or regex that maps to a category, an evidence type and explanation text. Starter set of roughly 20 rules:
- **collection:** "we collect", "information you provide", "precise location", "device identifiers", "contacts"
- **sharing:** "share … with (third parties|partners|affiliates|advertisers)", "service providers"
- **sale:** "sell", "in exchange for", "monetize"
- **retention:** "retain … (as long as necessary|indefinitely)", "for a period of"
- **deletion:** "delete your (account|data)", "request deletion" (a positive finding), and the *absence* of any deletion sentence (a document-level, `inferred` finding)
- **vague:** "may", "including but not limited to", "from time to time", "for business purposes". These apply only when combined with a collection or sharing verb, to limit false positives.

Explicit phrases (e.g. "we sell") → `explicit_statement`. Hedged or keyword-only matches → `keyword_match_review`. Only one finding per sentence per category is reported.

### 6.4 Risk score (indicative privacy exposure, 0–100)
| Factor | Points | Provenance | De-dup rule |
|---|---|---|---|
| Sensitive permission allowed (camera, mic, location) | 12 each | observed | Replaced by the mismatch factor if one exists for the same permission |
| Notifications allowed | 4 | observed | |
| Mismatch: high | 20 each | inferred | Replaces the base permission points |
| Mismatch: review | 8 each | inferred | Replaces the base permission points |
| Policy declares sale of data | 18 | policy_declared | Counted once |
| Policy declares third-party sharing | 12 | policy_declared | Counted once, not per sentence |
| Retention vague or indefinite | 8 | policy_declared / inferred | Counted once |
| No deletion mechanism found | 8 | inferred | Only if a policy was analyzed |

- `score = min(100, sum)`.
- Bands: 0–24 Low, 25–49 Moderate, 50–74 Elevated, 75–100 High.
- If no policy has been analyzed, the policy factors are 0, `completeness = partial`, and missing[] lists the policy. The UI shows "Partial — analyze a policy to complete."
- If no ledger observation exists, no score is produced.
- Fixed copy: *"Indicative exposure, not a security rating, legal finding or proof of misuse."*

## 7. Security and privacy
- Everything runs on the user's machine. The backend binds `127.0.0.1` only. No telemetry and no external calls.
- Policy text and excerpts are rendered as text only. React escapes by default, and `dangerouslySetInnerHTML` is never used. Highlights are built from offsets as separate `<mark>` text nodes.
- The backend report HTML-escapes every excerpt (Jinja2 autoescape, or `html.escape`).
- Policy text is treated as data. No instruction inside it is interpreted (there is no LLM).
- Injected scripts are fixed functions that return primitives. Nothing from the page is ever evaluated.
- URL normalization rejects non-http(s) URLs and malformed input with a clear error.
- Pages where scripts cannot be injected (`chrome://`, Web Store, PDF viewer) show the "Can't inspect this page" state. Chrome settings are still read where a URL is valid.
- Every permission change asks for confirmation and offers Undo for 10 s.

## 8. Testing architecture
- **Backend:** pytest for URL normalization, each policy rule (true positives and false positives), the mismatch matrix, scoring de-duplication and the partial path, and report escaping (a `<script>` excerpt). Target: about 25 fast tests.
- **Extension:** manual checklist (see MILESTONE_PLAN) against the demo site, plus Vitest for the pure helpers (origin normalization and contentSettings pattern building).
- **Contract:** `contracts/examples/*.json` validated by the backend's Pydantic models in a test. The frontend uses the same files as mocks while the backend is incomplete.

## 9. Feasibility spikes (do in S0, 10 minutes max)
| ID | Question | How to resolve fast | If it fails |
|---|---|---|---|
| S-1 | Does `contentSettings.location.get` return `allow` after the user clicks Allow on the page prompt? | Load the demo site, grant, then run the get in the popup console. | Show both columns anyway. The page-state column becomes the main "granted" signal. |
| S-2 | Does `set('ask')` cause the page to re-prompt, and does page state flip to `prompt`? | Reset, reload the demo site, then query. | Show "Reload the page to apply" and recheck after reload. |
| S-3 | Do contentSettings patterns accept `http://localhost:5500/*`? | Try a set and a get. | Serve the demo site on `127.0.0.1` with an explicit port pattern. |
| S-4 | Is camera or mic usable on the demo laptop? | Click "Scan receipt" on the demo site. | Demo location only. Camera rows still display. |
