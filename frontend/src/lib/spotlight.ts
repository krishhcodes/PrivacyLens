import type { SiteDetail } from '../types';

/** The site to feature: the PocketCalc demo site when audited, else the riskiest site with a mismatch, else the riskiest site. */
export function pickSpotlight(sites: SiteDetail[]): SiteDetail | undefined {
  const byScore = [...sites].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  return (
    sites.find(s => s.origin.includes('localhost:5500')) ||
    byScore.find(s => (s.assessment?.mismatches || []).length > 0) ||
    byScore[0]
  );
}
