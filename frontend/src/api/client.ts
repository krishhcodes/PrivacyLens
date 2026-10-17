// The only place the frontend talks to the ConsentScope backend.
// Contract: contracts/API_CONTRACT.md. Ported from contracts/api.ts.
import type {
  ActionRequest, AuditRequest, AuditResponse, DeleteResponse, PermissionAction, PolicyAnalyzeResponse,
  PurposeProfile, PurposeUpdateResponse, SiteAssessment, SiteDetail, SiteSummary,
} from './types';
import { accessToken, authEnabled, signOut } from './auth';

// VITE_API_BASE: backend URL without trailing slash (see .env.example).
export const API_BASE = (import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000').replace(/\/$/, '');

/** A non-2xx response. `detail` is the backend's `{"detail": ...}` message (422 lists are joined). */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  let r: Response;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = await accessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    r = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, `Backend unreachable at ${API_BASE}`);
  }
  // Sign-in expired or was revoked: back to the sign-in screen.
  if (r.status === 401 && authEnabled) void signOut();
  if (!r.ok) {
    let detail = `${r.status} ${r.statusText}`;
    try {
      const j = await r.json();
      detail = typeof j.detail === 'string'
        ? j.detail
        : Array.isArray(j.detail) ? j.detail.map((d: { msg?: string }) => d.msg ?? JSON.stringify(d)).join('; ') : detail;
    } catch { /* not JSON */ }
    throw new ApiError(r.status, detail);
  }
  return r.json() as Promise<T>;
}

const enc = encodeURIComponent;

export async function checkHealth(): Promise<boolean> {
  try {
    const r = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2000) });
    return r.ok;
  } catch {
    return false;
  }
}

export const getSites = () => call<{ sites: SiteSummary[] }>('GET', '/sites');
export const getSite = (origin: string) => call<SiteDetail>('GET', `/sites/${enc(origin)}`);
export const getAssessment = (origin: string) => call<SiteAssessment>('GET', `/sites/${enc(origin)}/assessment`);
export const postAudit = (body: AuditRequest) => call<AuditResponse>('POST', '/audits', body);
export const postAction = (body: ActionRequest) => call<PermissionAction>('POST', '/actions', body);
export const analyzePolicy = (text: string, origin?: string) =>
  call<PolicyAnalyzeResponse>('POST', '/policy/analyze', { text, ...(origin ? { origin } : {}) });
export const updatePurpose = (origin: string, purpose_profile: PurposeProfile) =>
  call<PurposeUpdateResponse>('PUT', `/sites/${enc(origin)}/purpose`, { purpose_profile });
export const deleteSite = (origin: string) => call<DeleteResponse>('DELETE', `/sites/${enc(origin)}`);
export const deleteAllSites = () => call<DeleteResponse>('DELETE', '/sites');
/** Opens the printable HTML report in a new tab. The link is signed by the backend and works for 10 minutes. */
export async function openReport(origin: string): Promise<void> {
  const tab = window.open('', '_blank'); // opened now so the browser doesn't block it as a pop-up
  try {
    const { url } = await call<{ url: string }>('GET', `/sites/${enc(origin)}/report-link`);
    if (tab) tab.location.href = `${API_BASE}${url}`;
    else window.location.href = `${API_BASE}${url}`;
  } catch (e) {
    tab?.close();
    throw e;
  }
}

// ---------- account ----------
export interface Me { user_id: string; email: string | null; auth: 'local' | 'supabase'; }
export interface DeviceToken { id: string; label: string; created_at: string; last_used_at: string | null; }

export const getMe = () => call<Me>('GET', '/me');
/** Deletes every site, observation, action and policy finding of this account, and all device tokens. */
export const deleteMyData = () => call<DeleteResponse>('DELETE', '/me/data');
export const createDeviceToken = (label: string) => call<DeviceToken & { token: string }>('POST', '/me/tokens', { label });
export const listDeviceTokens = () => call<{ tokens: DeviceToken[] }>('GET', '/me/tokens');
export const revokeDeviceToken = (id: string) => call<DeleteResponse>('DELETE', `/me/tokens/${enc(id)}`);
