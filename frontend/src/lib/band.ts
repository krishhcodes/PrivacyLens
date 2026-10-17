import type { ScoreBand, SiteDetail } from '../types';

/** Same thresholds as backend/app/scoring.py band_for(): 0–24 low, 25–49 moderate, 50–74 elevated, 75–100 high. */
export function bandFor(score: number): ScoreBand {
  if (score >= 75) return 'high';
  if (score >= 50) return 'elevated';
  if (score >= 25) return 'moderate';
  return 'low';
}

/** Mean of the backend scores of sites that have one (frontend-side aggregate; the backend scores per site). */
export function averageScore(sites: Pick<SiteDetail, 'score'>[]): number {
  const scores = sites.map(s => s.score).filter((s): s is number => s !== null && s !== undefined);
  return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
}
