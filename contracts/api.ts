// Drop-in replacement for extension/src/lib/api.ts (FRONTEND_HANDOFF.md §7),
// with the mock loader implemented. Mocks are the files in contracts/examples.
import type {
  ActionRequest, AuditRequest, AuditResponse, DeleteResponse, PermissionAction, PolicyAnalyzeResponse,
  PurposeProfile, PurposeUpdateResponse, SiteAssessment, SiteDetail, SiteSummary,
} from "./types";

// Set VITE_API_BASE to the hosted backend URL when deployed (no trailing slash).
const BASE = (import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000").replace(/\/$/, "");
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";

// Vite bundles the example JSON only when it is referenced. Adjust the glob path to where contracts/ lives.
const MOCKS = import.meta.glob("../../../contracts/examples/*.json", { eager: true, import: "default" }) as Record<string, unknown>;

async function load<T>(file: string): Promise<T> {
  const key = Object.keys(MOCKS).find((k) => k.endsWith(`/${file}`));
  if (!key) throw new Error(`Mock not found: ${file}`);
  return structuredClone(MOCKS[key]) as T;
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    let detail = `${r.status} ${r.statusText}`;
    try { const j = await r.json(); detail = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail); } catch { /* not JSON */ }
    throw new Error(detail);
  }
  return r.json() as Promise<T>;
}

const enc = encodeURIComponent;

export async function checkHealth(): Promise<boolean> {
  if (USE_MOCKS) return true;
  try {
    const r = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(2000) });
    return r.ok;
  } catch { return false; }
}

// Fire-and-forget from the popup: never await this before rendering the ledger.
export async function postAudit(body: AuditRequest): Promise<AuditResponse | null> {
  if (USE_MOCKS) return load("audits_response.json");
  return call<AuditResponse>("POST", "/audits", body).catch(() => null);
}

export async function postAction(body: ActionRequest): Promise<PermissionAction> {
  if (USE_MOCKS) return load("actions_response.json");
  return call("POST", "/actions", body);
}

export async function getSites(): Promise<{ sites: SiteSummary[] }> {
  if (USE_MOCKS) return load("sites_list.json");
  return call("GET", "/sites");
}

export async function getSite(origin: string): Promise<SiteDetail> {
  if (USE_MOCKS) return load("site_detail.json");
  return call("GET", `/sites/${enc(origin)}`); // 404 -> Error("Site not found: ...")
}

export async function analyzePolicy(text: string, origin?: string): Promise<PolicyAnalyzeResponse> {
  if (USE_MOCKS) return load("policy_analyze_response.json");
  return call("POST", "/policy/analyze", { text, ...(origin ? { origin } : {}) });
}

export async function getAssessment(origin: string): Promise<SiteAssessment> {
  if (USE_MOCKS) return load("assessment_response.json");
  return call("GET", `/sites/${enc(origin)}/assessment`);
}

export async function updatePurpose(origin: string, purpose_profile: PurposeProfile): Promise<PurposeUpdateResponse> {
  if (USE_MOCKS) return load("purpose_response.json");
  return call("PUT", `/sites/${enc(origin)}/purpose`, { purpose_profile });
}

export function reportUrl(origin: string): string {
  return `${BASE}/sites/${enc(origin)}/report`;
}

export async function deleteSite(origin: string): Promise<DeleteResponse> {
  if (USE_MOCKS) return { deleted: 1 };
  return call("DELETE", `/sites/${enc(origin)}`);
}

export async function deleteAllSites(): Promise<DeleteResponse> {
  if (USE_MOCKS) return { deleted: 0 };
  return call("DELETE", "/sites");
}
