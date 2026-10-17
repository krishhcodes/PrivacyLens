import type { PolicyFinding } from '../types';

interface PolicyRulePattern {
  rule_id: string;
  category: "collection" | "sharing" | "sale" | "retention" | "deletion" | "vague" | "tracking";
  regex: RegExp;
  explanation: string;
  recommendation: string;
  evidence_type: "explicit_statement" | "keyword_match_review";
  severity?: "info" | "review" | "high";
}

const POLICY_RULES: PolicyRulePattern[] = [
  {
    rule_id: "COL-01",
    category: "collection",
    regex: /We collect [^.!?]*(precise location|device identifiers|usage data|contacts|biometric)[^.!?]*/gi,
    explanation: "The policy explicitly declares the collection of sensitive telemetry (precise location, hardware identifiers, or personal attributes).",
    recommendation: "Consider whether this application has a justifiable functional need for this telemetry.",
    evidence_type: "explicit_statement",
    severity: "high"
  },
  {
    rule_id: "SHARE-01",
    category: "sharing",
    regex: /We share [^.!?]*(advertising partners|ad sponsors|commercial affiliates)[^.!?]*/gi,
    explanation: "Data is transmitted to external commercial advertising partners for marketing purposes.",
    recommendation: "Inspect whether an ad-tracking opt-out is provided or deploy network ad-blocking.",
    evidence_type: "explicit_statement",
    severity: "high"
  },
  {
    rule_id: "SALE-01",
    category: "sale",
    regex: /[^.!?]*(data brokers|commercial advertisers|sell personal data)[^.!?]*/gi,
    explanation: "Direct transmission or monetization with commercial data brokers and monetization exchanges.",
    recommendation: "Submit formal CCPA/GDPR Do Not Sell My Personal Information requests.",
    evidence_type: "explicit_statement",
    severity: "high"
  },
  {
    rule_id: "RET-02",
    category: "retention",
    regex: /We retain [^.!?]*(as long as necessary|indefinitely|for future purposes)[^.!?]*/gi,
    explanation: "'As long as necessary' is legally non-committal and provides no concrete calendar expiry for data purging.",
    recommendation: "Request explicit statutory retention timelines or account deletion.",
    evidence_type: "keyword_match_review",
    severity: "review"
  },
  {
    rule_id: "DEL-01",
    category: "deletion",
    regex: /You may request deletion [^.!?]*|[^.!?]*permanently deleted within [^.!?]*/gi,
    explanation: "The service provides an explicit user data deletion or account removal workflow.",
    recommendation: "Document the deletion support address for future data lifecycle management.",
    evidence_type: "explicit_statement",
    severity: "info"
  },
  {
    rule_id: "TRACK-01",
    category: "tracking",
    regex: /[^.!?]*(targeted ads|cross-context behavioral advertising|retargeting vendors|cookies and device identifiers)[^.!?]*/gi,
    explanation: "Active tracking across distinct online domains for behavioral profiling.",
    recommendation: "Enable browser tracking protection and clear local storage tokens.",
    evidence_type: "explicit_statement",
    severity: "review"
  }
];

export function analyzePolicyText(text: string, origin: string | null = null): { findings: PolicyFinding[]; count: number } {
  if (!text || text.trim().length === 0) {
    return { findings: [], count: 0 };
  }

  const findings: PolicyFinding[] = [];
  const foundExcerpts = new Set<string>();

  POLICY_RULES.forEach((rule) => {
    // Reset regex index
    rule.regex.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = rule.regex.exec(text)) !== null) {
      const excerpt = match[0].trim();
      const char_start = match.index;
      const char_end = char_start + match[0].length;

      // Avoid exact duplicate spans
      if (!foundExcerpts.has(`${char_start}-${char_end}`)) {
        foundExcerpts.add(`${char_start}-${char_end}`);
        findings.push({
          id: `f-${rule.rule_id}-${char_start}`,
          origin,
          excerpt,
          char_start,
          char_end,
          category: rule.category,
          rule_id: rule.rule_id,
          explanation: rule.explanation,
          recommendation: rule.recommendation,
          evidence_type: rule.evidence_type,
          provenance: "policy_declared"
        });
      }
    }
  });

  // Sort findings by position in text
  findings.sort((a, b) => a.char_start - b.char_start);

  return {
    findings,
    count: findings.length
  };
}
