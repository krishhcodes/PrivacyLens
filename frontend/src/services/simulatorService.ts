import type { 
  PermissionType, 
  BrowserSetting, 
  ScoreBand,
  SiteDetail
} from '../types';
import { getStoredSites } from './scannerService';
import { detectMismatches } from './permissionService';
import { calculateSiteRisk } from './scoreService';
import { bandFor as calculateRiskBand } from '../lib/band';

export interface SimulationOverride {
  origin: string;
  permission: PermissionType;
  simulatedSetting: BrowserSetting;
}

export interface SimulationResult {
  baselineAggregateScore: number;
  baselineBand: ScoreBand;
  simulatedAggregateScore: number;
  simulatedBand: ScoreBand;
  scoreDelta: number; // negative number means risk decreased!
  mitigatedFindingsCount: number;
  mitigatedRisks: string[];
  remainingConcerns: string[];
}

export function runSimulation(overrides: SimulationOverride[], sites: SiteDetail[] = getStoredSites()): SimulationResult {

  // 1. Baseline: the real (backend) scores
  const baselineScores = sites.map(s => s.score ?? 0);
  const baselineAggregateScore = Math.round(
    baselineScores.reduce((acc, curr) => acc + curr, 0) / (baselineScores.length || 1)
  );
  const baselineBand = calculateRiskBand(baselineAggregateScore);

  // 2. Map overrides by `${origin}-${permission}`
  const overrideMap = new Map<string, BrowserSetting>();
  overrides.forEach(o => {
    overrideMap.set(`${o.origin.toLowerCase()}-${o.permission}`, o.simulatedSetting);
  });

  const mitigatedRisks: string[] = [];
  const remainingConcerns: string[] = [];
  const simulatedScores: number[] = [];

  sites.forEach(site => {
    // Clone observations and apply overrides
    const simulatedObservations = site.observations.map(obs => {
      const key = `${site.origin.toLowerCase()}-${obs.permission}`;
      if (overrideMap.has(key)) {
        const newSetting = overrideMap.get(key)!;
        return {
          ...obs,
          browser_setting: newSetting,
          page_state: newSetting === "allow" ? ("granted" as const) : ("denied" as const),
          provenance: "simulated" as const
        };
      }
      return obs;
    });

    const mismatches = detectMismatches(site.purpose_profile, simulatedObservations);
    const assessment = calculateSiteRisk(
      site.origin,
      site.purpose_profile,
      simulatedObservations,
      site.policy_findings || [],
      mismatches
    );
    // Estimate = real score + the change the local rules predict (local rules differ from the backend's,
    // so only their delta is used; see INTEGRATION_PLAN.md D4).
    const localBaseline = calculateSiteRisk(
      site.origin,
      site.purpose_profile,
      site.observations,
      site.policy_findings || [],
      detectMismatches(site.purpose_profile, site.observations)
    );
    simulatedScores.push(Math.max(0, Math.min(100, (site.score ?? 0) + assessment.score - localBaseline.score)));

    // Track what changed for this site
    site.observations.forEach(origObs => {
      const key = `${site.origin.toLowerCase()}-${origObs.permission}`;
      if (overrideMap.has(key) && overrideMap.get(key) === "block" && origObs.browser_setting === "allow") {
        mitigatedRisks.push(`Blocked ${origObs.permission.toUpperCase()} on ${site.display_name} (-${origObs.permission === "location" ? 20 : 12} pts)`);
      }
    });

    if (mismatches.length > 0) {
      mismatches.forEach(m => {
        remainingConcerns.push(`${site.display_name}: Remaining mismatch on ${m.permission}`);
      });
    }

    if (site.policy_findings && site.policy_findings.some(f => f.category === "sale" || f.category === "sharing")) {
      remainingConcerns.push(`${site.display_name}: Policy still declares commercial ad syndication`);
    }
  });

  const simulatedAggregateScore = Math.round(
    simulatedScores.reduce((acc, curr) => acc + curr, 0) / (simulatedScores.length || 1)
  );
  const simulatedBand = calculateRiskBand(simulatedAggregateScore);
  const scoreDelta = simulatedAggregateScore - baselineAggregateScore;

  return {
    baselineAggregateScore,
    baselineBand,
    simulatedAggregateScore,
    simulatedBand,
    scoreDelta,
    mitigatedFindingsCount: mitigatedRisks.length,
    mitigatedRisks,
    remainingConcerns: Array.from(new Set(remainingConcerns)).slice(0, 5)
  };
}
