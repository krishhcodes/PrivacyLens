import type { AuditReport, PolicyFinding, SiteDetail } from '../types';
import { averageScore, bandFor } from '../lib/band';

/** Builds the dossier from the sites currently loaded (backend data when live). */
export function generateReportFromSites(sites: SiteDetail[]): AuditReport {
  const avgScore = averageScore(sites);
  const mismatches = sites.flatMap(s => s.assessment?.mismatches || []);
  const findings: PolicyFinding[] = sites.flatMap(s => s.policy_findings || []);

  // De-duplicated advice: one line per non-info mismatch, then the policy findings' recommendations.
  const advice = new Set<string>();
  sites.forEach(s => (s.assessment?.mismatches || [])
    .filter(m => m.severity !== 'info')
    .forEach(m => advice.add(`${s.display_name}: review ${m.permission} access (${m.rule_id}). ${m.explanation}`)));
  findings.forEach(f => f.recommendation && advice.add(f.recommendation));

  const now = new Date();
  return {
    id: `rep-${now.getTime()}`,
    title: `Privacy Audit Dossier (${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`,
    generated_at: now.toISOString(),
    scope: sites.map(s => `${s.display_name} (${s.origin})`),
    overall_score: avgScore,
    overall_band: bandFor(avgScore),
    sites_audited_count: sites.length,
    total_mismatches_count: mismatches.length,
    high_severity_count: mismatches.filter(m => m.severity === 'high').length,
    policies_analyzed_count: sites.filter(s => s.completeness === 'full').length,
    top_findings: findings.slice(0, 5),
    key_recommendations: [...advice].slice(0, 6),
    disclaimer: "Indicative privacy-exposure assessment based on observed browser permission settings and rule-based policy matching. Not a security rating, legal finding, or proof of misuse.",
    methodology: "Permission settings were recorded by the ConsentScope extension and the local scanner (Chrome/Edge/Brave saved site settings). Each site's purpose is inferred from its address and title; mismatches and scores are computed by the ConsentScope backend rules."
  };
}
