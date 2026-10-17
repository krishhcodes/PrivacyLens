import { API_BASE } from "./config.js";

// Account link saved by the website after you sign in (sw.js "setLink"): { token, tokenId, userId, email }.
// Local mode has no link and needs none.
export async function getAccount() {
  const { account } = await chrome.storage.local.get("account");
  return account || null;
}

export class SignInNeeded extends Error {
  constructor() { super("Sign in on the PrivacyLens website to link this extension to your account."); this.name = "SignInNeeded"; }
}

async function call(method, path, body) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  const account = await getAccount();
  if (account?.token) headers.Authorization = `Bearer ${account.token}`;
  const r = await fetch(`${API_BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (r.status === 401) throw new SignInNeeded();
  if (!r.ok) {
    let detail = `${r.status}`;
    try { const j = await r.json(); detail = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail); } catch {}
    throw new Error(detail);
  }
  return r.json();
}
const enc = encodeURIComponent;

export async function checkHealth() {
  try { return (await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2500) })).ok; } catch { return false; }
}
export const postAudit = (body) => call("POST", "/audits", body);
export const postAction = (body) => call("POST", "/actions", body);
export const getAssessment = (origin) => call("GET", `/sites/${enc(origin)}/assessment`);
/** A signed report link (valid 10 minutes), because a new tab can't send the sign-in header. */
export const reportUrl = async (origin) => `${API_BASE}${(await call("GET", `/sites/${enc(origin)}/report-link`)).url}`;
