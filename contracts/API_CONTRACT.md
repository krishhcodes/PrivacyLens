# ConsentScope API contract

Base URL: `http://127.0.0.1:8000` (the server binds to 127.0.0.1 only; `localhost:8000` reaches it too).
All bodies are JSON. Timestamps are ISO-8601 UTC (`2026-10-14T06:12:07Z`).
Errors return `{"detail": "<message>"}`: **400** bad origin or empty policy, **404** unknown site, **422** body fails validation (then `detail` is a list).
Interactive docs: `http://127.0.0.1:8000/docs`. Machine-readable: [`openapi.json`](openapi.json). Types: [`types.ts`](types.ts). Client: [`api.ts`](api.ts).

## Origins in paths
Send `encodeURIComponent(origin)`, e.g. `/sites/http%3A%2F%2Flocalhost%3A5500/assessment`. An unencoded origin also works.
The server normalizes every origin with the same rule as `lib/origin.ts` (lowercase host, default port dropped, `www.` kept, non-http(s) rejected with 400).

## Endpoints

| Method | Path | Request | Response | Example |
|---|---|---|---|---|
| GET | `/health` | — | `{status:"ok", version}` | `health.json` |
| POST | `/audits` | `AuditRequest` | `AuditResponse` | `audits_request.json` → `audits_response.json` |
| GET | `/sites` | — | `{sites: SiteSummary[]}` | `sites_list.json` |
| GET | `/sites/{origin}` | — | `SiteDetail` | `site_detail.json` |
| POST | `/actions` | `ActionRequest` | `PermissionAction` | `actions_request.json` → `actions_response.json` |
| POST | `/policy/analyze` | `{text, origin?}` | `{origin, finding_count, findings[]}` | `policy_analyze_request.json` → `policy_analyze_response.json` |
| PUT | `/sites/{origin}/purpose` | `{purpose_profile}` | `PurposeUpdateResponse` | `purpose_request.json` → `purpose_response.json` |
| GET | `/sites/{origin}/assessment` | — | `SiteAssessment` | `assessment_response.json`, `assessment_after_policy.json` |
| GET | `/sites/{origin}/report` | — | `text/html` print-ready report | — |
| DELETE | `/sites/{origin}` | — | `{deleted: 1}` (404 if unknown) | `delete_response.json` |
| DELETE | `/sites` | — | `{deleted: n}` | — |

### POST /audits
```json
{ "origin": "http://localhost:5500/index.html", "source": "popup_audit", "page_title": "PocketCalc — Calculator",
  "observations": [ { "permission": "location", "browser_setting": "allow", "page_state": "granted", "observed_at": "2026-10-14T06:12:07Z" } ] }
```
- `source` defaults to `popup_audit`. `page_title` is optional, but send `tab.title`: it is what lets the demo site be classified as a calculator.
- `observed_at` defaults to server time. `provenance` is decided by the server (`simulated` when `source` is `simulated`, else `observed`); clients cannot upgrade it.
- An observation identical to the previous one for that origin and permission within 60 s is skipped (`deduplicated` in the response).
- A user-set purpose is never overwritten by inference.
- `source: "auto_audit"` comes from the extension when a site's permission state changes while you browse (only sites with an allowed/blocked/granted/denied permission are sent).
- `source: "local_scan"` comes from `scanner/scan.py`. Its observations carry `setting_changed_at` (when the browser last changed the rule) and `page_state: "not_checked"`.

### POST /actions
`after_setting` must be the value **re-read** after the change, not the requested one. `acted_at` defaults to server time; `error` is optional. Logging an action does not change the ledger: re-audit with `source: "post_action_recheck"` so the assessment reflects the new state.

### POST /policy/analyze
`text` up to 200,000 characters; blank text → 400 `"Paste at least one sentence of a privacy policy."`. With `origin`, findings are stored for that site and **replace** its earlier findings, and the site's score becomes `full`. Without `origin` nothing is stored.
Each finding has `char_start`/`char_end` offsets into the submitted text. The document-level `DEL-00` ("no deletion statement") has an empty excerpt and offsets 0/0.

### Score
`score = min(100, Σ factor.points)`; bands 0–24 low, 25–49 moderate, 50–74 elevated, 75–100 high. `risk` is `null` until the site has at least one observation. `completeness` is `partial` until a policy has been analyzed for the site.

## Changes from the original handoff
- `site_detail.json` now includes the `SiteSummary` fields (`latest_observations`, `band`, `score`, `completeness`) that `SiteDetail extends SiteSummary` requires.
- `assessment_after_policy.json`: score corrected from 58 to 40, matching its factors (20 + 12 + 8 + 0); band stays moderate.
- Added: `page_title` on audits, `saved`/`deduplicated` on the audit response, optional `error` on actions, request example files.
- `GET /sites/{origin}` also returns a computed `assessment` once observations exist (it is `null` in the example file).

## Google Safe Browsing (optional)
Every `SiteSummary` and `SiteAssessment` has `safety: {status, threats[], checked_at}`. `status` is `safe`, `unsafe`, `not_checked` (no `GOOGLE_SAFE_BROWSING_API_KEY` on the backend, or not checked yet), `not_applicable` (local/private address, never sent) or `error` (retried after 10 min). Results are cached 24 h. With a key set, the backend sends each **audited** site's origin (domain only) to Google's v4 Lookup API; nothing else leaves the machine. An `unsafe` site gets a 50-point `SAFE-BROWSING` risk factor.

## Accounts (hosted mode)
`GET /health` returns `auth: "local"` or `"supabase"`.

- **Local mode** (`SUPABASE_URL` and `SUPABASE_JWT_SECRET` unset): no sign-in; everything belongs to the user `local`. This is the laptop setup, unchanged. An older local database is migrated to that user automatically.
- **Supabase mode**: every endpoint except `/health` needs `Authorization: Bearer <token>`, otherwise `401`. Every site, observation, action and finding belongs to one user; other users get `404` for it. The token is either
  - a Supabase access token (the website, after Google or email-link sign-in), verified with the project's public keys at `{SUPABASE_URL}/auth/v1/.well-known/jwks.json`, or with `SUPABASE_JWT_SECRET` for HS256 projects; or
  - a device token `cs_…` (the extension and the scanner). The website creates one per device; the backend stores only its SHA-256. Device tokens can send and read data but get `403` on account endpoints and on deletes.

| Method | Path | What it does |
|---|---|---|
| GET | `/me` | `{user_id, email, auth}` |
| DELETE | `/me/data` | Deletes all of this user's data and device tokens → `{deleted}` (number of sites) |
| POST | `/me/tokens` | `{label}` → `{id, label, created_at, last_used_at, token}`; `token` is shown only here |
| GET | `/me/tokens` | `{tokens: [{id, label, created_at, last_used_at}]}` |
| DELETE | `/me/tokens/{id}` | Revokes one device token |
| GET | `/sites/{origin}/report-link` | `{url}`: a report path signed for 10 minutes, for opening in a new tab (a tab can't send the header) |

`DELETE /sites` and `DELETE /sites/{origin}` are scoped to the signed-in user. The Safe Browsing cache is shared across users (it holds only public origins and Google's verdict) and drops origins nobody has audited any more.
