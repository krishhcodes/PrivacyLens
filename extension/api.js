import { API_BASE } from "./config.js";

async function call(method, path, body) {
  const r = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
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
export const reportUrl = (origin) => `${API_BASE}/sites/${enc(origin)}/report`;
