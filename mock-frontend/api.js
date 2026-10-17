// ConsentScope API client. Same function names and shapes as the extension's
// src/lib/api.ts (see contracts/api.ts), so the real frontend can swap in directly.

const DEFAULT_BASE = "http://127.0.0.1:8000";
// Example payloads live next to this folder: consentscope/contracts/examples
const EXAMPLES = new URL("../contracts/examples/", import.meta.url);

export const config = {
  get base() { return read("cs.base") || (location.port === "8000" ? location.origin : DEFAULT_BASE); },
  set base(v) { write("cs.base", v); },
  get useMocks() { return read("cs.mocks") === "true"; },
  set useMocks(v) { write("cs.mocks", String(!!v)); },
};

function read(k) { try { return localStorage.getItem(k); } catch { return null; } }
function write(k, v) { try { localStorage.setItem(k, v); } catch { /* storage blocked: session only */ } }

async function load(name) {
  const r = await fetch(new URL(name, EXAMPLES));
  if (!r.ok) throw new Error(`Mock file missing: ${name}`);
  return r.json();
}

async function call(method, path, body) {
  const r = await fetch(`${config.base}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    let detail = `${r.status} ${r.statusText}`;
    try { const j = await r.json(); detail = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail); } catch {}
    const err = new Error(detail);
    err.status = r.status;
    throw err;
  }
  return r.json();
}

const enc = (origin) => encodeURIComponent(origin);

export async function checkHealth() {
  if (config.useMocks) return true;
  try {
    const r = await fetch(`${config.base}/health`, { signal: AbortSignal.timeout(2000) });
    return r.ok;
  } catch { return false; }
}

export async function postAudit(body) {
  if (config.useMocks) return load("audits_response.json");
  return call("POST", "/audits", body);
}

export async function postAction(body) {
  if (config.useMocks) return load("actions_response.json");
  return call("POST", "/actions", body);
}

export async function getSites() {
  if (config.useMocks) return load("sites_list.json");
  return call("GET", "/sites");
}

export async function getSite(origin) {
  if (config.useMocks) return load("site_detail.json");
  return call("GET", `/sites/${enc(origin)}`);
}

export async function analyzePolicy(text, origin) {
  if (config.useMocks) return load("policy_analyze_response.json");
  return call("POST", "/policy/analyze", { text, ...(origin ? { origin } : {}) });
}

export async function getAssessment(origin) {
  if (config.useMocks) return load("assessment_response.json");
  return call("GET", `/sites/${enc(origin)}/assessment`);
}

export async function updatePurpose(origin, purpose_profile) {
  if (config.useMocks) return load("purpose_response.json");
  return call("PUT", `/sites/${enc(origin)}/purpose`, { purpose_profile });
}

export function reportUrl(origin) {
  return `${config.base}/sites/${enc(origin)}/report`;
}

export async function deleteSite(origin) {
  if (config.useMocks) return { deleted: 1 };
  return call("DELETE", `/sites/${enc(origin)}`);
}

export async function deleteAllSites() {
  if (config.useMocks) return { deleted: 0 };
  return call("DELETE", "/sites");
}

export async function loadSamplePolicy() {
  const r = await fetch(new URL("sample_policy.txt", EXAMPLES));
  return r.text();
}

// Same rule as backend app/origin.py and the extension's lib/origin.ts.
export function normalizeOrigin(url) {
  let parsed;
  try { parsed = new URL(url); } catch { throw new Error(`Invalid URL: ${url}`); }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error(`Non-http(s) URL: ${url}`);
  const defaultPort = parsed.protocol === "http:" ? "80" : "443";
  const port = parsed.port && parsed.port !== defaultPort ? `:${parsed.port}` : "";
  return `${parsed.protocol}//${parsed.hostname.toLowerCase()}${port}`;
}
