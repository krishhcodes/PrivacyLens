# ConsentScope — Frontend Handoff
> Everything your frontend teammate needs to build the extension without the backend being ready.

---

## 0. What you are building

A **Chrome MV3 extension** with two HTML surfaces:
- `popup.html` — 360 × 560 px, opens when the user clicks the toolbar icon
- `dashboard.html` — opens as a full tab from the popup

The extension talks to a **local FastAPI backend at `http://127.0.0.1:8000`** for analysis, history and reports. The ledger and permission controls work **even when the backend is down** — never make the UI depend on the backend for rendering the ledger.

---

## 1. Project structure

```
extension/
  public/
    manifest.json        ← hand-written, do not let Vite touch it
    icons/               ← 16/48/128 px PNGs
  src/
    popup/
      main.tsx
      Popup.tsx
    dashboard/
      main.tsx
      Dashboard.tsx
    lib/
      origin.ts          ← URL normalization (S1, task 1)
      chromeSettings.ts  ← contentSettings reads/writes (S1, task 2)
      pageState.ts       ← navigator.permissions via scripting (S1, task 3)
      api.ts             ← all fetch calls to the backend, USE_MOCKS aware
      storage.ts         ← chrome.storage.local helpers
    components/
      Ledger.tsx
      LedgerRow.tsx
      ConfirmDialog.tsx
      Toast.tsx
      ProvenanceBadge.tsx
      RiskChip.tsx
      FindingCard.tsx
      ScoreBreakdown.tsx
      MismatchCard.tsx
    types.ts             ← TypeScript types mirroring the contract enums/models
  vite.config.ts         ← multi-page build
  tailwind.config.ts
  .env                   ← USE_MOCKS=true during development
```

---

## 2. manifest.json (copy this exactly)

```json
{
  "manifest_version": 3,
  "name": "ConsentScope",
  "version": "0.1.0",
  "description": "See what each site can access. Understand the risks. Take control.",
  "key": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2a...",

  "permissions": [
    "contentSettings",
    "activeTab",
    "scripting",
    "storage"
  ],
  "host_permissions": [
    "http://127.0.0.1:8000/*"
  ],

  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png"
    }
  },

  "background": {
    "service_worker": "sw.js",
    "type": "module"
  },

  "icons": {
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

**Notes:**
- The `key` field gives you a **stable extension ID** during dev so your CORS origin (`chrome-extension://<id>`) matches what the backend expects. Generate one with `openssl genrsa 2048 | openssl rsa -pubout -outform DER | base64 -w0` or ask the BE teammate for the value they put in the CORS config. Both sides must agree on the same ID.
- `sw.js` only opens `dashboard.html` on install. No other service-worker logic in the MVP.
- Do **not** add `<all_urls>` to host_permissions. The extension only needs to reach localhost.

---

## 3. TypeScript types (types.ts)

```typescript
export type PermissionType = "location" | "camera" | "microphone" | "notifications";
export type BrowserSetting = "allow" | "block" | "ask" | "unsupported" | "unknown";
export type PageState = "granted" | "denied" | "prompt" | "unavailable" | "not_checked";
export type Provenance = "observed" | "policy_declared" | "inferred" | "simulated" | "unknown";
export type Severity = "info" | "review" | "high";
export type PolicyCategory = "collection" | "sharing" | "sale" | "retention" | "deletion" | "vague";
export type PurposeProfile = "calculator" | "video_meeting" | "maps" | "weather" | "general";
export type PurposeSource = "inferred" | "user";
export type PurposeConfidence = "low" | "medium" | "high";
export type ScoreBand = "low" | "moderate" | "elevated" | "high";
export type Completeness = "full" | "partial";
export type AuditSource = "popup_audit" | "manual_url" | "post_action_recheck" | "simulated";
export type ActionType = "block" | "reset_ask" | "undo";

// One row in the ledger
export interface PermissionObservation {
  id?: string;
  permission: PermissionType;
  browser_setting: BrowserSetting;
  page_state: PageState;
  observed_at: string;          // ISO-8601 UTC
  source?: AuditSource;
  provenance: Provenance;
}

// What the popup builds locally (never from the backend)
export interface LocalLedger {
  origin: string;
  observed_at: string;
  observations: PermissionObservation[];
}

// Backend models
export interface PermissionAction {
  id: string;
  permission: PermissionType;
  action: ActionType;
  before_setting: BrowserSetting;
  after_setting: BrowserSetting;
  succeeded: boolean;
  acted_at: string;
}

export interface PolicyFinding {
  id: string;
  origin: string | null;
  excerpt: string;
  char_start: number;
  char_end: number;
  category: PolicyCategory;
  rule_id: string;
  explanation: string;
  recommendation: string;
  evidence_type: "explicit_statement" | "keyword_match_review";
  provenance: Provenance;
}

export interface RiskFactor {
  factor_id: string;
  label: string;
  points: number;
  provenance: Provenance;
  evidence_refs: string[];
  explanation: string;
}

export interface RiskAssessment {
  score: number;
  band: ScoreBand;
  completeness: Completeness;
  factors: RiskFactor[];
  missing: string[];
  assessed_at: string;
  disclaimer: string;
}

export interface MismatchFinding {
  permission: PermissionType;
  browser_setting: BrowserSetting;
  page_state: PageState;
  profile: PurposeProfile;
  rule_id: string;
  severity: Severity;
  explanation: string;
  limitation_note: string;
  provenance: Provenance;
}

export interface SiteAssessment {
  origin: string;
  purpose_profile: PurposeProfile;
  purpose_source: PurposeSource;
  mismatches: MismatchFinding[];
  risk: RiskAssessment | null;
}

export interface SiteSummary {
  origin: string;
  display_name: string;
  purpose_profile: PurposeProfile;
  purpose_source: PurposeSource;
  purpose_confidence: PurposeConfidence;
  first_audited_at: string;
  last_audited_at: string;
  latest_observations: PermissionObservation[];
  band: ScoreBand | null;
  score: number | null;
  completeness: Completeness | null;
}

export interface SiteDetail extends SiteSummary {
  observations: PermissionObservation[];
  actions: PermissionAction[];
  policy_findings: PolicyFinding[];
  assessment: SiteAssessment | null;
}
```

---

## 4. Origin normalization (lib/origin.ts)

**Both sides use the same rule. Do not deviate.**

```typescript
export function normalizeOrigin(url: string): string {
  let parsed: URL;
  try { parsed = new URL(url); } catch { throw new Error(`Invalid URL: ${url}`); }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Non-http(s) URL: ${url}`);
  }
  const defaultPort = parsed.protocol === "http:" ? "80" : "443";
  const host = parsed.hostname.toLowerCase();
  const port = parsed.port && parsed.port !== defaultPort ? `:${parsed.port}` : "";
  return `${parsed.protocol}//${host}${port}`;
}

// contentSettings.set / get primaryPattern
export function toContentSettingsPattern(origin: string): string {
  return `${origin}/*`;
}
```

Examples that must pass:
```
normalizeOrigin("https://www.Google.COM/search?q=foo") === "https://www.google.com"
normalizeOrigin("http://localhost:5500/index.html")    === "http://localhost:5500"
normalizeOrigin("http://example.com:80/")             === "http://example.com"
normalizeOrigin("chrome://extensions")                 → throws
```

---

## 5. Reading Chrome settings (lib/chromeSettings.ts)

```typescript
const PERMISSION_TYPES: PermissionType[] = ["location", "camera", "microphone", "notifications"];

// contentSettings type name differs from our PermissionType for one entry
function toCSType(p: PermissionType): string {
  return p === "location" ? "geolocation" : p;
  // camera → "camera", microphone → "microphone", notifications → "notifications"
  // NOTE: spike S-1 must confirm these are valid contentSettings type names
}

export async function readAllSettings(origin: string): Promise<Record<PermissionType, BrowserSetting>> {
  const results = await Promise.all(
    PERMISSION_TYPES.map(async (perm) => {
      try {
        const type = toCSType(perm);
        const result = await chrome.contentSettings[type].get({ primaryUrl: `${origin}/` });
        const mapping: Record<string, BrowserSetting> = {
          allow: "allow", block: "block", ask: "ask",
          session_only: "ask",  // treat as ask
        };
        return [perm, mapping[result.setting] ?? "unknown"] as const;
      } catch {
        return [perm, "unsupported"] as const;
      }
    })
  );
  return Object.fromEntries(results) as Record<PermissionType, BrowserSetting>;
}

export async function setSetting(
  origin: string,
  permission: PermissionType,
  setting: "allow" | "block" | "ask"
): Promise<void> {
  const type = toCSType(permission);
  const pattern = toContentSettingsPattern(origin);
  await chrome.contentSettings[type].set({ primaryPattern: pattern, setting });
}
```

**Spike S-1 action item:** load the demo site, grant location, then call:
```js
chrome.contentSettings.geolocation.get({ primaryUrl: "http://localhost:5500/" }, console.log)
```
in the popup DevTools console. Confirm it returns `{ setting: "allow" }`. If it returns `"ask"`, the page-state column is the primary signal for "granted".

---

## 6. Reading page-context permission state (lib/pageState.ts)

```typescript
// Maps our PermissionType to the Permissions API name
const PAGE_PERMISSION_NAME: Record<PermissionType, string> = {
  location: "geolocation",
  camera: "camera",
  microphone: "microphone",
  notifications: "notifications",
};

// This function runs INSIDE the tab via scripting.executeScript
// It must be self-contained — no imports, no closures over outer vars
function queryAllPermissions(): Record<string, string> {
  const names = ["geolocation", "camera", "microphone", "notifications"];
  return Promise.all(
    names.map(name =>
      navigator.permissions.query({ name: name as PermissionName })
        .then(s => [name, s.state] as const)
        .catch(() => [name, "unavailable"] as const)
    )
  ).then(Object.fromEntries);
}

export async function readPageStates(tabId: number): Promise<Record<PermissionType, PageState>> {
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: queryAllPermissions,
    });
    const raw = result.result as Record<string, string>;
    const stateMap: Record<string, PageState> = {
      granted: "granted", denied: "denied", prompt: "prompt",
    };
    return {
      location:      stateMap[raw["geolocation"]]  ?? "unavailable",
      camera:        stateMap[raw["camera"]]        ?? "unavailable",
      microphone:    stateMap[raw["microphone"]]    ?? "unavailable",
      notifications: stateMap[raw["notifications"]] ?? "unavailable",
    };
  } catch {
    // chrome://, Web Store, PDF viewer etc. — scripting is not allowed
    return {
      location: "unavailable", camera: "unavailable",
      microphone: "unavailable", notifications: "unavailable",
    };
  }
}
```

---

## 7. API client (lib/api.ts) — USE_MOCKS aware

```typescript
const BASE = "http://127.0.0.1:8000";
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";

async function load<T>(path: string): Promise<T> {
  // In mock mode, import the JSON from contracts/examples/
  // Vite's ?url import or a static map works fine
  throw new Error("implement mock loader");
}

export async function checkHealth(): Promise<boolean> {
  if (USE_MOCKS) return true;
  try {
    const r = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(2000) });
    return r.ok;
  } catch { return false; }
}

export async function postAudit(body: object): Promise<void> {
  if (USE_MOCKS) return;
  fetch(`${BASE}/audits`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {}); // fire-and-forget; failures are silent
}

export async function postAction(body: object): Promise<{ id: string }> {
  if (USE_MOCKS) return { id: "mock-action-id" };
  const r = await fetch(`${BASE}/actions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

export async function getSites(): Promise<{ sites: SiteSummary[] }> {
  if (USE_MOCKS) return load("/contracts/examples/sites_list.json");
  const r = await fetch(`${BASE}/sites`);
  return r.json();
}

export async function getSite(origin: string): Promise<SiteDetail> {
  if (USE_MOCKS) return load("/contracts/examples/site_detail.json");
  const r = await fetch(`${BASE}/sites/${encodeURIComponent(origin)}`);
  if (r.status === 404) throw new Error("Site not found");
  return r.json();
}

export async function analyzePolicy(text: string, origin?: string): Promise<{ findings: PolicyFinding[] }> {
  if (USE_MOCKS) return load("/contracts/examples/policy_analyze_response.json");
  const r = await fetch(`${BASE}/policy/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, ...(origin ? { origin } : {}) }),
  });
  if (!r.ok) throw new Error((await r.json()).detail);
  return r.json();
}

export async function getAssessment(origin: string): Promise<SiteAssessment> {
  if (USE_MOCKS) return load("/contracts/examples/assessment_response.json");
  const r = await fetch(`${BASE}/sites/${encodeURIComponent(origin)}/assessment`);
  return r.json();
}

export async function updatePurpose(origin: string, purpose_profile: PurposeProfile): Promise<void> {
  if (USE_MOCKS) return;
  await fetch(`${BASE}/sites/${encodeURIComponent(origin)}/purpose`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ purpose_profile }),
  });
}

export function reportUrl(origin: string): string {
  return `${BASE}/sites/${encodeURIComponent(origin)}/report`;
}

export async function deleteSite(origin: string): Promise<void> {
  if (USE_MOCKS) return;
  await fetch(`${BASE}/sites/${encodeURIComponent(origin)}`, { method: "DELETE" });
}

export async function deleteAllSites(): Promise<void> {
  if (USE_MOCKS) return;
  await fetch(`${BASE}/sites`, { method: "DELETE" });
}
```

`.env` during development:
```
VITE_USE_MOCKS=true
```
Set `VITE_USE_MOCKS=false` once the backend is running.

---

## 8. Chrome storage helpers (lib/storage.ts)

```typescript
// Cache the ledger so the popup shows the last known state instantly
export async function cacheLedger(origin: string, observations: PermissionObservation[]): Promise<void> {
  await chrome.storage.local.set({ [`ledger:${origin}`]: { observations, cached_at: new Date().toISOString() } });
}

export async function getCachedLedger(origin: string): Promise<PermissionObservation[] | null> {
  const data = await chrome.storage.local.get(`ledger:${origin}`);
  return data[`ledger:${origin}`]?.observations ?? null;
}

export async function clearSiteStorage(origin: string): Promise<void> {
  await chrome.storage.local.remove(`ledger:${origin}`);
}

export async function clearAllStorage(): Promise<void> {
  await chrome.storage.local.clear();
}
```

---

## 9. Popup flow (step by step)

```
1. chrome.tabs.query({active:true, currentWindow:true})
   → get tab.url and tab.id

2. try normalizeOrigin(tab.url)
   → if it throws → show "Can't inspect this page"

3. In parallel:
   a. readAllSettings(origin)        → browser_setting per permission
   b. readPageStates(tab.id)         → page_state per permission  (may return "unavailable")
   c. checkHealth()                   → sets the backend status dot
   d. getCachedLedger(origin)         → show immediately while a+b load

4. Build LocalLedger from a + b, timestamp = now().
   Render the Ledger component.

5. Fire-and-forget: postAudit({ origin, source:"popup_audit", observations:[...] })

6. Cache: cacheLedger(origin, observations)

7. If backend is online: getAssessment(origin) → render RiskChip + top 2 mismatch cards
   If backend is offline: show "Analysis offline" message in the chip area

8. Block button clicked:
   a. Show ConfirmDialog
   b. setSetting(origin, permission, "block")
   c. Re-read: readAllSettings + readPageStates (the recheck)
   d. Update UI: show struck-through before → after, flash green
   e. Show Toast with Undo (10s timer, clicking Undo calls setSetting with the old value)
   f. postAction({ origin, permission, action:"block", before_setting, after_setting, succeeded:true, acted_at })
   g. If page state didn't flip: show "Reload the page for the site to see the change" [Reload]
```

---

## 10. States to implement for every UI surface

| State | Where | Copy |
|---|---|---|
| Loading skeleton | Popup, Site detail | 4 grey bars, "Reading Chrome's settings…" |
| Can't inspect | Popup | "Chrome doesn't let extensions inspect this page. Try it on a regular website." |
| Page state unavailable | Ledger row, Page column | "—" with tooltip "Couldn't run a check on this page" |
| Backend offline | Popup chip, Dashboard analysis panels | "Analysis service is offline. Your permission ledger still works. Start the backend to analyze policies." |
| Confirm block | Popup | "Block location for localhost:5500? The site won't be able to ask again until you reset it." [Cancel] [Block location] |
| Success | Popup | Toast: "Location blocked and verified ✓ Undo (10s)" |
| Failure | Popup | Toast red: "Couldn't change the setting: <error>. Nothing was changed." |
| Needs reload | Popup | "Saved. Reload the page for the site to see the change." [Reload] |
| Empty policy | Analyzer | "Paste at least one sentence of a privacy policy." |
| No findings | Analyzer | "No red-flag patterns matched. This doesn't mean the policy is safe — rules can miss things." |
| Simulated data | Any | Striped banner: "Demo data — not a real browser observation" |
| Empty sites list | Dashboard | "No sites audited yet. Open any site and click the ConsentScope icon." |

---

## 11. Design tokens (Tailwind config additions)

```js
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      paper:   "#FAF7F2",
      card:    "#FFFFFF",
      rule:    "#E7E0D5",
      ink:     "#1F1B16",
      "ink-2": "#5B544A",
      allow:   { bg: "#FEF3C7", fg: "#B45309" },
      high:    { bg: "#FEE2E2", fg: "#B91C1C" },
      protect: { bg: "#DCFCE7", fg: "#15803D" },
      neutral: { bg: "#F1F5F9", fg: "#475569" },
    },
    fontFamily: {
      sans: ["Inter", "sans-serif"],
      mono: ["JetBrains Mono", "monospace"],
    },
    borderRadius: { DEFAULT: "8px" },
  }
}
```

Provenance badge colours:
- `OBSERVED` — `--ink` border, `--ink` text
- `POLICY` — `#4338CA` (indigo-700)
- `INFERRED` — amber outline
- `SIMULATED` — dashed slate border + `repeating-linear-gradient` stripe background
- `UNKNOWN` — slate

---

## 12. Popup sizing

```css
/* popup.html <body> */
width: 360px;
min-height: 400px;
max-height: 560px;
overflow-y: auto;
```

Chrome clips popups at 800 × 600. 360 × 560 gives comfortable room.

---

## 13. What NOT to do

- **Don't** call `chrome.permissions.onAdded` to detect site permission grants. That event fires for the extension's own permissions, not for website grants. There is no Chrome-wide event for website permission grants.
- **Don't** show "Ask" as a granted state. "Ask" means the site will be prompted next time it calls the API.
- **Don't** wait for `postAudit` to finish before rendering the ledger.
- **Don't** import anything inside the `func` passed to `scripting.executeScript`. It runs in the page context without your module graph.
- **Don't** use `dangerouslySetInnerHTML` for policy excerpts. Use React's default escaping or build highlight nodes from offsets as separate text nodes.
- **Don't** show a score when there are no observations. If `risk` is `null`, show "Audit a site first."
- **Don't** claim the ledger shows historical grants. It shows the **current** Chrome setting and the **current** page-context state at the time of the last audit.

---

## 14. Quick reference: which file talks to which API

| File | API calls made |
|---|---|
| `popup/Popup.tsx` | `checkHealth`, `postAudit`, `getAssessment` |
| `dashboard/Sites.tsx` | `getSites` |
| `dashboard/SiteDetail.tsx` | `getSite`, `getAssessment`, `updatePurpose`, `postAction`, `deleteSite` |
| `dashboard/PolicyAnalyzer.tsx` | `analyzePolicy` |
| `dashboard/Report.tsx` | opens `reportUrl(origin)` in a new tab |
| `dashboard/Settings.tsx` | `deleteSite`, `deleteAllSites`, `clearSiteStorage`, `clearAllStorage` |
| `lib/chromeSettings.ts` | Chrome `contentSettings` only — no backend |
| `lib/pageState.ts` | Chrome `scripting` only — no backend |

---

## 15. Contacts for blockers

| Blocker | Who owns it |
|---|---|
| CORS rejected / extension ID mismatch | BE teammate — they set the allowed CORS origin |
| `contentSettings` type name wrong | Spike S-1 in S0 — run in the popup console |
| Backend response shape changed | Look at `contracts/API_CONTRACT.md` — if BE changed it, update the mock files too |
| `scripting.executeScript` not working on a page | Check the manifest `activeTab` permission and whether the tab is injectable |
