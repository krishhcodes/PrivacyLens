// Single source of site data for every page.
// live    → loaded from the ConsentScope backend (GET /sites + GET /sites/{origin}); no demo data mixed in.
// offline → backend unreachable; pages show the seeded demo fixtures under a "backend offline" banner.
import { useSyncExternalStore } from 'react';
import * as api from '../api/client';
import type { SiteDetail as ApiSiteDetail } from '../api/types';
import type { SiteDetail } from '../types';
import { MOCK_SITES } from '../data/mockSites';

export type DataMode = 'loading' | 'live' | 'offline';

export interface SiteStoreState {
  mode: DataMode;
  sites: SiteDetail[];
  error: string | null;
  loadedAt: string | null;
}

let state: SiteStoreState = { mode: 'loading', sites: [], error: null, loadedAt: null };
const listeners = new Set<() => void>();
let inflight: Promise<void> | null = null;

function setState(next: Partial<SiteStoreState>) {
  state = { ...state, ...next };
  listeners.forEach(l => l());
}

/** Backend SiteDetail → UI SiteDetail. `observations` in the UI means "current state per permission",
 *  which is the backend's `latest_observations`; the full history stays on the server. */
export function fromApi(d: ApiSiteDetail): SiteDetail {
  return {
    ...d,
    first_audited_at: d.first_audited_at ?? '',
    last_audited_at: d.last_audited_at ?? '',
    observations: d.latest_observations,
    latest_observations: d.latest_observations,
  } as SiteDetail;
}

/** Load (or reload) everything from the backend. Falls back to demo fixtures only when the backend is unreachable. */
export function loadSites(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const { sites } = await api.getSites();
      // Only fetch details for sites that are new or were audited since the last load.
      const known = new Map(state.mode === 'live' ? state.sites.map(s => [s.origin, s]) : []);
      const details = await Promise.all(sites.map(async s => {
        const prev = known.get(s.origin);
        return prev && prev.last_audited_at === (s.last_audited_at ?? '') && prev.score === s.score
          ? prev
          : fromApi(await api.getSite(s.origin));
      }));
      const ordered = details.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
      const unchanged = state.mode === 'live' && ordered.length === state.sites.length && ordered.every((s, i) => s === state.sites[i]);
      setState({ mode: 'live', sites: unchanged ? state.sites : ordered, error: null, loadedAt: new Date().toISOString() });
    } catch (e) {
      const unreachable = e instanceof api.ApiError && e.status === 0;
      if (state.mode === 'offline') {
        // Still offline: keep the demo data (and any demo edits) as they are.
      } else if (unreachable || state.mode !== 'live') {
        setState({ mode: 'offline', sites: MOCK_SITES, error: (e as Error).message, loadedAt: null });
      } else {
        // Backend answered with an error: keep the last real data, surface the error.
        setState({ error: (e as Error).message });
      }
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Re-fetch one site after it changed on the server. */
export async function reloadSite(origin: string): Promise<SiteDetail | null> {
  if (state.mode !== 'live') return null;
  const site = fromApi(await api.getSite(origin));
  setState({ sites: state.sites.map(s => (s.origin === site.origin ? site : s)) });
  return site;
}

/** Replace one site in memory (offline demo edits). */
export function putSite(site: SiteDetail): void {
  setState({ sites: state.sites.map(s => (s.origin === site.origin ? site : s)) });
}

export function getSiteState(): SiteStoreState {
  return state;
}

// Sites recorded by the extension while you browse appear without a manual refresh:
// poll while the tab is visible and reload when it regains focus.
const POLL_MS = 5000;
let pollTimer: ReturnType<typeof setInterval> | null = null;
function startAutoRefresh() {
  if (pollTimer) return;
  pollTimer = setInterval(() => { if (document.visibilityState === 'visible') void loadSites(); }, POLL_MS);
  window.addEventListener('focus', () => void loadSites());
}

export function subscribeSites(listener: () => void): () => void {
  listeners.add(listener);
  if (state.mode === 'loading' && !inflight) void loadSites();
  startAutoRefresh();
  return () => listeners.delete(listener);
}

/** React hook: current sites + mode; triggers the first load. */
export function useSites(): SiteStoreState {
  return useSyncExternalStore(subscribeSites, getSiteState);
}
