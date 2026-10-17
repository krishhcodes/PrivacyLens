# Integration plan: PrivacyLens frontend + ConsentScope backend

Status: **read paths integrated and verified in the browser. All decisions made; every applicable endpoint connected except the deferred purpose update (D4) and deletes (D5, by decision).**
Last updated: 2026-10-14.

## 1. What was found

| | Frontend (`frontend/`, from PrivacyLens.zip) | Backend (`backend/` + `contracts/`) |
|---|---|---|
| Stack | React 19, TypeScript 6, Vite 8, Tailwind 4, react-router-dom 7, lucide-react, npm | Python 3.12, FastAPI, Pydantic 2, SQLite (`backend/data/consentscope.db`), uvicorn |
| Entry | `src/main.tsx` → `src/App.tsx` (10 routes) | `backend/app/main.py` (`create_app`), run with `backend/run.bat` / `run.sh` |
| Data | 100 % local: seeded fixtures in `src/data/*.ts`, state in `localStorage`; no `fetch` anywhere | SQLite tables `websites`, `observations`, `actions`, `policy_analyses`, `policy_findings` |
| Business rules | Own TS engines: `scoreService` (bands 30/60/80, points 4–25), `permissionService` (13 purpose profiles), `policyService` (6 regex rules incl. `tracking`) | Python engines: `scoring.py` (bands 25/50/75), `rules/purpose.py` (5 profiles, MIS-01…MIS-10), `rules/policy.py` |
| Auth | none | none (local tool; CORS restricts to localhost, `chrome-extension://`, and `CONSENTSCOPE_ALLOWED_ORIGINS`) |
| Tests | none; `npm run build` (tsc + vite) and `oxlint` | `pytest` (63 tests) |
| Baseline check (before any change) | `npm ci` OK, `npm run build` OK (only a >500 kB chunk warning) | `pytest -q` → **63 passed** |

Other folders kept as-is: `extension/` (real MV3 extension, no build), `scanner/` (reads saved browser permissions and uploads via `POST /audits`), `demo-site/` (PocketCalc on :5500), `mock-frontend/` (the backend's no-build test UI, still served at `/mock/`), `contracts/` (contract, OpenAPI, TS types, example payloads).

Type compatibility: the frontend's `src/types/privacy.ts` was written from the same `FRONTEND_HANDOFF.md` as the backend, so `SiteSummary`, `SiteDetail`, `PermissionObservation`, `PermissionAction`, `PolicyFinding`, `RiskAssessment`, `MismatchFinding` and `SiteAssessment` match field-for-field. Differences:
- Frontend adds optional UI-only fields: `icon`, `category_label`, `policy_text`, `declared_third_parties`, `data_collected`, `severity`/`confidence` on findings, `reason` on mismatches.
- Frontend enums are wider: 13 purpose profiles (backend 5), extra permissions `geolocation`/`storage`/`cookies` (backend: `location`, `camera`, `microphone`, `notifications` + 19 scanner-only extras the frontend doesn't know), extra policy categories (`tracking` etc.).
- Backend adds `setting_changed_at` and `source: "local_scan"` on observations.

## 2. Backend endpoint matrix

| Backend endpoint | Method | Backend purpose | Frontend feature/component | Current frontend behavior | Integration status | Notes/blockers |
|---|---|---|---|---|---|---|
| `/health` | GET | liveness + version | `api/client.ts` `checkHealth()` | — | Available, not used by pages | Pages detect offline from the `/sites` call itself (network error → offline) |
| `/sites` | GET | list audited sites with latest observations, score, band | `services/siteStore.ts` → every page | was localStorage / `MOCK_SITES` | **Connected, verified** | Then `/sites/{origin}` per site (summary lacks actions, findings, assessment) |
| `/sites/{origin}` | GET | full ledger, actions, policy findings, computed assessment | siteStore → Overview, Scanner (ledger, popup, inspector), Permissions, Policy (saved findings), Simulator, Reports | was localStorage | **Connected, verified** | UI `observations` = backend `latest_observations` (one per permission) |
| `/sites/{origin}/assessment` | GET | assessment only | `api/client.ts` `getAssessment()` | — | Available, not needed | The same assessment arrives inside `/sites/{origin}` |
| `/audits` | POST | record observations | Block / Ask / Undo (popup view, ledger quick-block, Overview, Permissions, Simulator "enforce") | was localStorage | **Connected via the extension, verified** | Website → `extension/bridge.js` → `sw.js` sets the real Chrome setting, re-reads it, then posts `source: post_action_recheck` with the re-read value |
| `/actions` | POST | log a Block/Reset/Undo with the re-read result | same buttons | was localStorage | **Connected via the extension, verified** | Posted by the extension's service worker (`before`/`after` are real reads) |
| `/policy/analyze` | POST | rule findings with offsets; with `origin` stores + replaces | Policy workspace: live preview (no `origin`) + "Save to site" (with `origin`) | local regex per keystroke | **Connected, verified** | 400 ms debounce; blank text never sent (backend returns 400) |
| `/sites/{origin}/purpose` | PUT | user-set purpose | none | — | **Deferred (D4: leave for now)** | `updatePurpose()` exists in the client |
| `/sites/{origin}/report` | GET (HTML) | printable per-site report | Scanner inspector "Printable report ↗", Reports ledger "report ↗" | — | **Connected (links), verified** | Hidden in offline/demo mode |
| `/sites/{origin}` | DELETE | delete one site | none | — | **Not exposed (D5: no delete in the UI)** | `deleteSite()` exists in the client, unused |
| `/sites` | DELETE | delete all sites | none | — | **Not exposed (D5)** | Settings reset clears browser preferences only |
| `/`, `/mock/*`, `/contracts/*` | GET | backend's own test UI + example payloads | none | — | Not integrated (by design) | Kept for backend testing; PrivacyLens does not replace or depend on it |
| `/docs`, `/openapi.json` | GET | FastAPI docs | none | — | Not integrated (developer tool) | — |

No authentication, upload, search or webhook endpoints exist in the backend.

## 3. Frontend feature inventory

| Route / feature | Backend support | Plan |
|---|---|---|
| `/` Command Centre: site count, mismatch count, risk gauge, site list, PocketCalc spotlight + quick block, score breakdown | **Supported** (sites, assessment); quick block → D1 | Read real data; aggregate gauge = average of backend scores (frontend-side, as today) |
| `/` InsightsRail + "+48 drift" + "remediations pending" tiles | none (drift/recs are mock) | Keep; values come from whatever D2 decides for drift/recs |
| `/scanner` ledger table, filters, inspector drawer | **Supported** | Real data; Storage column shows "—" (backend doesn't track storage) |
| `/scanner` ExtensionPopupSim (Block / Ask / Undo with 10 s toast) | **Partial** (D1) | — |
| `/scanner` and TopBar "Re-scan All" (animated progress) | **None** (no scan-all endpoint; real scans come from the extension or `scanner/scan.py`) | Re-fetch `/sites` behind the same animation (routine, see §5) |
| `/permissions` PocketCalc spotlight + toggle | **Partial** (data yes, toggle D1) | — |
| `/permissions` purpose taxonomy matrix | **Conflicts** with backend matrix (D4) | — |
| `/policy` workspace (site picker, editable text, findings with offsets) | **Supported** with differences (D3) | — |
| `/exposure` topology graph | **None** (static `mockExposure.ts`) | Keep as frontend-only mock, labelled |
| `/drift` snapshots + compare | **None** | **Removed** (decision D3) |
| `/simulator` what-if matrix + "apply permanently" | **None** for simulation; apply → D1 | Keep simulation client-side (D4 covers which scoring rules) |
| `/recommendations` action centre | **None** | **Removed** (decision D3); Reports derives advice from backend mismatches and policy findings |
| `/reports` executive dossier, JSON export, print | **Partial** (per-site HTML report exists) | Keep dossier; build it from real sites; add link to per-site report |
| `/settings` latency slider, state export, factory reset, intro replay | **Partial** (reset ↔ D5) | — |
| Vault intro, torch cursor, glass cards, particles | frontend-only | Untouched |

Duplicate / conflicting implementations: scoring (`scoreService` vs `scoring.py`), mismatch rules (`permissionService` vs `rules/purpose.py`), policy rules (`policyService` vs `rules/policy.py`), purpose taxonomy (13 vs 5). The backend is the source of truth for anything the server returns; the open question is only what the client-side-only features (simulator, taxonomy display) should use (D4).

## 4. Target structure

```
consentscope/
  backend/        FastAPI API (unchanged unless a decision requires it)
  frontend/       PrivacyLens (Vite app) — primary UI
  extension/  scanner/  demo-site/  contracts/  mock-frontend/  docs/
  INTEGRATION_PLAN.md
```
The frontend talks to the backend directly at `VITE_API_BASE` (default `http://127.0.0.1:8000`). The backend's CORS already allows any `http://localhost:<port>`, so the Vite dev server on :5180 (pinned in vite.config.ts) works without a proxy or backend change.

## 5. Routine decisions already made (documented, reversible)

1. Frontend copied into `frontend/` without its `.git`, `dist`, `node_modules`. The untouched original is in `../_incoming/PrivacyLens` (and the ZIP).
2. A local git repo was created at the project root with a checkpoint commit of the unchanged state (`7b3d6b2`).
3. One API client (`frontend/src/api/`) ported from `contracts/api.ts`; base URL from `VITE_API_BASE`; no other file builds URLs.
4. Backend `location` maps to the frontend's location column (the ledger currently looks up `geolocation`, which the backend never sends).
5. "Re-scan All" keeps its progress animation but performs a real refresh (`GET /sites` + details) instead of recomputing fixtures.
6. Fields the backend doesn't provide (`icon`, `category_label`, `policy_text`, `declared_third_parties`) fall back to the existing UI defaults (`🌐`, etc.); nothing is invented server-side.

## 6. Decisions

| # | Question | Answer (2026-10-14) | Done |
|---|---|---|---|
| D1 | Block / Ask / Undo: a web page cannot change Chrome settings | **D**: the website asks the extension to change the real setting | Yes. Without the extension the buttons say how to install it; offline demo edits demo data in memory only |
| D2 | Demo vs real data | A: real backend data only; demo fixtures only when the backend is unreachable, under a "backend offline" banner, never mixed | Yes |
| D3 | Drift / Recommendations / Exposure | Remove Drift and Recommendations tabs; keep Exposure with demo data | Yes (routes, nav, services, fixtures removed; Exposure labelled demo) |
| D3b | Policy page: save findings to a site? | "Whatever is best" → 1: live preview + "Save to site" | Yes |
| D4 | Simulator / purpose matrix rules | Leave for now | Untouched rules; simulator now uses real scores as baseline (see limitations) |
| D5 | Delete | No delete option in the UI; "no trace of demo data in backend-implemented features" | Yes |
| — | Text | Free to align text with the backend; no design changes | Done page by page |

## 7. Progress log

- 2026-10-14: audit, workspace, baseline build/tests, this plan, API client layer.
- 2026-10-14: `siteStore` (live/offline), all pages moved to it; Drift + Recommendations removed; Overview tiles/insights, Reports dossier, Settings, Sidebar, TopBar, footer now show backend values; Policy preview via backend; per-site report links; ledger `location` column fixed; scanner-only permissions shown read-only.
- Verified in the browser against the running backend (8 real sites): Overview, Scanner (ledger, popup, inspector, block → extension notice), Permissions, Policy (one debounced `POST /policy/analyze`, no origin), Reports, Settings, Simulator; offline banner + demo fallback with the backend stopped. No console errors. `npm run build` OK, `pytest` 63 passed (backend unchanged).

- 2026-10-14: D1 = D implemented: `extension/bridge.js` (content script), `sw.js` handler (localhost/allow-listed origins only, scored permissions only, set → re-read → `/actions` + `/audits`), `frontend/src/api/extension.ts`. Verified end to end in a throwaway Edge profile with the unpacked extension: block via website → Chrome setting `block` → backend action + `post_action_recheck`; UI "Ask" in the popup view → Chrome `ask` → backend updated; non-localhost page gets no bridge. Test site removed afterwards. Without the extension, buttons show install instructions.
- 2026-10-14: Policy "Save to site" (live mode only): `POST /policy/analyze` with the origin, then the site reloads. Verified on a temporary test site (completeness → full, 3 findings stored), which was deleted afterwards.

## 8. Known limitations

- **Simulator (D4 left as is):** its local rules ignore the `general` purpose and only score permissions whose page state is `granted`. Most real data is `general` with `page_state: not_checked` (from the local scanner), so projected deltas are usually 0. Fix when wanted: port `backend/app/scoring.py` + `rules/purpose.py` to TypeScript (D4 option A) or add a backend simulate endpoint.
- **Purpose matrix on Permissions** still shows the frontend's 11-profile reference table, which differs from the backend's 5-profile rules (D4).
- **Exposure map** is static demo data (by decision).
- **Storage** column in the ledger is always "—": the backend does not track storage.
- **Permission changes** need the extension loaded in the same browser as the website. The bridge runs on `http://localhost:*` and `http://127.0.0.1:*`; a hosted website needs its origin added to `extension/manifest.json` (`content_scripts.matches`) and `extension/config.js` (`WEBSITE_ORIGINS`). `page_state` after a website-triggered change is `not_checked` (no tab is open for that site).
- Score gauges animate with `requestAnimationFrame`; in a hidden browser tab they show 0 until the tab is visible (pre-existing behaviour).

## 9. Future scope (in the sidebar under "Future scope")

| Feature | Today | What it needs to become real |
|---|---|---|
| Exposure Map (`/exposure`) | Static demo graph, labelled "Future scope — preview" | Backend records third parties per site (e.g. from analyzed policies) and exposes a graph endpoint |
| What-If Simulator (`/simulator`) | Real scores as baseline; projections from simplified frontend rules (often 0 for `general` sites) | A backend simulate endpoint, or the backend scoring rules ported to TypeScript |
| Purpose override | Not exposed | A control calling `PUT /sites/{origin}/purpose` |
| Drift / Recommendations | Removed | Would need history comparison and recommendation endpoints |

## 10. Automatic recording while browsing

`extension/watch.js` (content script on every http/https page) reports the page's permission states on load and whenever they change. `sw.js` reads the site's Chrome settings and posts `source: "auto_audit"` **only** when something is allowed/blocked/granted/denied (or the site was already recorded), and only if it differs from what was last sent. Plain browsing is never sent. The website polls every 5 s (and on focus), fetching details only for changed sites. Verified in a throwaway Edge profile: plain visit → not recorded; allow location + visit → recorded and shown on the website without a refresh; camera granted while the page is open → recorded. Backend `AuditSource` gained `auto_audit` (additive; contracts/openapi.json regenerated; 63 tests pass).
- 2026-10-14: Permission Intel tab removed (user: redundant). Mismatch count badge moved to Privacy Scanner; Overview links go to the Scanner (spotlight opens that site's inspector via ?origin=). /permissions redirects to /.
- 2026-10-14: Google Safe Browsing: `backend/app/safebrowsing.py` (v4 Lookup, stdlib HTTP, 24 h cache in `safety_checks`, audited non-local origins only, key from `GOOGLE_SAFE_BROWSING_API_KEY` via `backend/.env`), `safety` on sites/assessments, +50 `SAFE-BROWSING` factor for unsafe sites; Scanner ledger badge + SAFETY filter, inspector panel, Settings status. 4 new backend tests (67 total). Not verified against the live Google API (no key on this machine yet).
