import type {
  SiteDetail,
  PermissionType,
  BrowserSetting,
  PermissionAction,
  ActionType
} from '../types';
import type { PermissionType as ApiPermissionType } from '../api/types';
import { setPermissionViaExtension } from '../api/extension';
import { detectMismatches } from './permissionService';
import { calculateSiteRisk } from './scoreService';
import { getSiteState, loadSites, putSite, reloadSite } from './siteStore';

/** Current sites: real backend data when live, demo fixtures when the backend is offline. */
export function getStoredSites(): SiteDetail[] {
  return getSiteState().sites;
}

const ACTIONABLE = new Set<string>(['location', 'camera', 'microphone', 'notifications']);

/**
 * Live: the ConsentScope extension changes the real Chrome setting, re-reads it and records the
 * action + re-audit in the backend (INTEGRATION_PLAN.md, D1 option D); then the site is reloaded.
 * Offline demo: updates the in-memory demo fixtures only.
 */
export async function updateSitePermission(
  origin: string,
  permission: PermissionType,
  newSetting: BrowserSetting,
  actionType?: ActionType
): Promise<{ site: SiteDetail; action: PermissionAction }> {
  const { mode, sites } = getSiteState();
  if (mode !== 'offline') {
    if (!ACTIONABLE.has(permission)) {
      throw new Error(`${permission} is reported by the local scanner and can't be changed from here.`);
    }
    const r = await setPermissionViaExtension(origin, permission as ApiPermissionType, newSetting, actionType);
    const site = await reloadSite(origin);
    if (!site) throw new Error(`Site not found: ${origin}`);
    if (r.backendError) console.warn('Permission changed in Chrome, but the backend did not record it:', r.backendError);
    return { site, action: site.actions[0] };
  }
  const found = sites.find(s => s.origin.toLowerCase() === origin.toLowerCase());
  if (!found) {
    throw new Error(`Site not found: ${origin}`);
  }
  const site: SiteDetail = { ...found, observations: [...found.observations] };

  const obsIndex = site.observations.findIndex(o => o.permission === permission);
  const prevSetting = obsIndex !== -1 ? site.observations[obsIndex].browser_setting : "ask";
  const newPageState = newSetting === "allow" ? "granted" : newSetting === "block" ? "denied" : "prompt";

  if (obsIndex !== -1) {
    site.observations[obsIndex] = {
      ...site.observations[obsIndex],
      browser_setting: newSetting,
      page_state: newPageState,
      observed_at: new Date().toISOString(),
      provenance: "simulated"
    };
  }

  const action: PermissionAction = {
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    permission,
    action: actionType ?? (newSetting === "block" ? "block" : "reset_ask"),
    before_setting: prevSetting,
    after_setting: newSetting,
    succeeded: true,
    acted_at: new Date().toISOString()
  };

  site.actions = [action, ...(site.actions || [])];
  site.last_audited_at = new Date().toISOString();

  const mismatches = detectMismatches(site.purpose_profile, site.observations);
  const assessment = calculateSiteRisk(
    site.origin,
    site.purpose_profile,
    site.observations,
    site.policy_findings || [],
    mismatches
  );

  site.score = assessment.score;
  site.band = assessment.band;
  site.completeness = assessment.completeness;
  site.assessment = {
    origin: site.origin,
    purpose_profile: site.purpose_profile,
    purpose_source: site.purpose_source,
    mismatches,
    risk: assessment
  };

  putSite(site);
  return { site, action };
}

/**
 * "Re-scan": reloads every site from the backend. The audits themselves are recorded by the
 * extension popup and by scanner/scan.py; the backend has no scan-everything endpoint.
 */
export async function runFullAuditScan(
  onProgress?: (progress: number, stage: string) => void
): Promise<SiteDetail[]> {
  onProgress?.(20, "Contacting the ConsentScope backend...");
  const loading = loadSites();
  onProgress?.(55, "Loading audited sites and their latest observations...");
  await loading;
  onProgress?.(90, "Refreshing mismatch findings and risk scores...");
  const { mode } = getSiteState();
  onProgress?.(100, mode === 'live' ? "Ledger refreshed from the backend." : "Backend offline: showing demo data.");
  return getStoredSites();
}
