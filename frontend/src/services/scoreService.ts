import type { 
  RiskAssessment, 
  RiskFactor, 
  ScoreBand, 
  Completeness, 
  PermissionObservation, 
  PolicyFinding, 
  MismatchFinding,
  PurposeProfile 
} from '../types';

/**
 * Deterministic Transparent Scoring Engine for PrivacyLens
 * Risk Score: 0 (Ultra Private / No Exposure) to 100 (Critical Exposure)
 * Inverse: Privacy Health Score = 100 - Risk Score
 */

export function calculateRiskBand(score: number): ScoreBand {
  if (score < 30) return "low";
  if (score < 60) return "moderate";
  if (score < 80) return "elevated";
  return "high";
}

export function calculateSiteRisk(
  origin: string,
  purpose: PurposeProfile,
  observations: PermissionObservation[],
  findings: PolicyFinding[],
  mismatches: MismatchFinding[]
): RiskAssessment {
  const factors: RiskFactor[] = [];
  const missing: string[] = [];

  let totalPoints = 0;

  // 1. Evaluate Purpose-Permission Mismatches (High Penalty: 20-30 pts each)
  mismatches.forEach((mismatch) => {
    let pts = mismatch.severity === "high" ? 20 : 12;
    factors.push({
      factor_id: `MISMATCH-${mismatch.rule_id}-${mismatch.permission}`,
      label: `Permission Mismatch: ${mismatch.permission.toUpperCase()} (${purpose})`,
      points: pts,
      provenance: "inferred",
      evidence_refs: [`obs-${origin}-${mismatch.permission}`],
      explanation: mismatch.explanation
    });
    totalPoints += pts;
  });

  // 2. Evaluate Active Hardware Permissions (If not already counted as mismatch)
  const mismatchPerms = new Set(mismatches.map(m => m.permission));
  observations.forEach((obs) => {
    if (obs.browser_setting === "allow" && obs.page_state === "granted" && !mismatchPerms.has(obs.permission)) {
      let pts = 0;
      let label = "";

      if (obs.permission === "location") {
        pts = 15;
        label = "Active Precise Location Grant";
      } else if (obs.permission === "camera") {
        pts = 12;
        label = "Active Camera Sensor Access";
      } else if (obs.permission === "microphone") {
        pts = 12;
        label = "Active Microphone Stream Access";
      } else if (obs.permission === "notifications") {
        pts = 4;
        label = "Push Notifications Grant";
      }

      if (pts > 0) {
        factors.push({
          factor_id: `PERM-GRANT-${obs.permission}`,
          label,
          points: pts,
          provenance: obs.provenance,
          evidence_refs: [obs.id || `obs-${obs.permission}`],
          explanation: `${obs.permission} permission is granted in browser contentSettings.`
        });
        totalPoints += pts;
      }
    } else if (obs.browser_setting === "block") {
      // Document protective block (0 points added)
      factors.push({
        factor_id: `PERM-BLOCKED-${obs.permission}`,
        label: `${obs.permission.charAt(0).toUpperCase() + obs.permission.slice(1)} Blocked`,
        points: 0,
        provenance: "observed",
        evidence_refs: [obs.id || `obs-${obs.permission}`],
        explanation: `${obs.permission} is securely blocked by user preference.`
      });
    }
  });

  // 3. Evaluate Policy Findings
  if (findings.length === 0) {
    missing.push("Privacy policy not yet analyzed — policy factors not included.");
  } else {
    findings.forEach((finding) => {
      let pts = 0;
      let label = "";

      if (finding.category === "sale") {
        pts = 25;
        label = "Policy: Commercial data sale or broker syndication";
      } else if (finding.category === "sharing") {
        pts = 12;
        label = "Policy: Third-party advertising sharing declared";
      } else if (finding.category === "retention" || finding.category === "vague") {
        pts = 8;
        label = "Policy: Indefinite or vague retention schedule";
      } else if (finding.category === "collection") {
        pts = 6;
        label = "Policy: Sensitive personal telemetry collected";
      }

      if (pts > 0) {
        factors.push({
          factor_id: `POLICY-${finding.rule_id}`,
          label,
          points: pts,
          provenance: finding.provenance,
          evidence_refs: [finding.id],
          explanation: finding.explanation
        });
        totalPoints += pts;
      }
    });
  }

  // Constrain total risk score between 5 and 98
  const finalScore = Math.min(98, Math.max(5, totalPoints));
  const band = calculateRiskBand(finalScore);
  const completeness: Completeness = findings.length > 0 ? "full" : "partial";

  return {
    score: finalScore,
    band,
    completeness,
    factors,
    missing,
    assessed_at: new Date().toISOString(),
    disclaimer: "Indicative privacy-exposure assessment. Not a formal security rating, statutory audit, or legal assertion."
  };
}

export function calculateAggregatePrivacyScore(sites: { score: number | null }[]): { aggregateScore: number; band: ScoreBand } {
  const validScores = sites.map(s => s.score ?? 30);
  const avg = validScores.length ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : 30;
  return {
    aggregateScore: avg,
    band: calculateRiskBand(avg)
  };
}
