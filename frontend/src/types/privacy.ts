// Core PrivacyLens Data Models mirroring FRONTEND_HANDOFF.md and API Contracts.
// Backend wire types live in src/api/types.ts; these are a superset with UI-only fields.
import type { ExtraPermissionType, Safety } from '../api/types';
export type { Safety, SafetyStatus } from '../api/types';

export type PermissionType = 
  | "location" 
  | "geolocation" 
  | "camera" 
  | "microphone" 
  | "notifications" 
  | "storage" 
  | "cookies"
  | ExtraPermissionType; // reported by scanner/scan.py: shown, not scored, not actionable

export type BrowserSetting = "allow" | "block" | "ask" | "unsupported" | "unknown";
export type PageState = "granted" | "denied" | "prompt" | "unavailable" | "not_checked";
export type Provenance = "observed" | "policy_declared" | "inferred" | "simulated" | "unknown";
export type Severity = "info" | "review" | "high";
export type PolicyCategory = "collection" | "sharing" | "sale" | "retention" | "deletion" | "vague" | "tracking" | "data_collection" | "third_party_sharing" | "data_sale" | "retention_indefinite" | "no_deletion_right" | "cross_site_tracking";

export type PurposeProfile = 
  | "calculator" 
  | "video_meeting" 
  | "maps" 
  | "weather" 
  | "general" 
  | "social" 
  | "productivity" 
  | "ecommerce"
  | "health"
  | "utility"
  | "communication"
  | "navigation"
  | "storage";

export type PurposeSource = "inferred" | "user";
export type PurposeConfidence = "low" | "medium" | "high" | number;
export type ScoreBand = "low" | "moderate" | "elevated" | "high";
export type Completeness = "full" | "partial";
export type AuditSource = "popup_audit" | "manual_url" | "post_action_recheck" | "simulated" | "local_scan" | "auto_audit";
export type ActionType = "block" | "reset_ask" | "undo";

// Single permission observation in the ledger
export interface PermissionObservation {
  id?: string;
  permission: PermissionType;
  browser_setting: BrowserSetting;
  page_state: PageState;
  observed_at: string; // ISO-8601 UTC
  setting_changed_at?: string | null; // when the browser last changed this rule (local scanner only)
  source?: AuditSource;
  provenance: Provenance;
}

// Local Ledger built by the scanner / popup
export interface LocalLedger {
  origin: string;
  observed_at: string;
  observations: PermissionObservation[];
}

// Permission action logged
export interface PermissionAction {
  id: string;
  permission: PermissionType;
  action: ActionType;
  before_setting: BrowserSetting;
  after_setting: BrowserSetting;
  succeeded: boolean;
  error?: string | null;
  acted_at: string;
}

// Policy finding identified by deterministic policy analysis
export interface PolicyFinding {
  id: string;
  origin: string | null;
  excerpt: string;
  char_start: number;
  char_end: number;
  category: PolicyCategory;
  rule_id: string;
  explanation: string;
  recommendation: string;
  evidence_type: "explicit_statement" | "keyword_match_review";
  provenance: Provenance;
  severity?: Severity;
  confidence?: number;
}

// Individual risk factor contributing to the risk score
export interface RiskFactor {
  factor_id: string;
  label: string;
  points: number;
  provenance: Provenance;
  evidence_refs: string[];
  explanation: string;
}

// Comprehensive risk assessment
export interface RiskAssessment {
  score: number; // 0 (safest) to 100 (highest exposure)
  band: ScoreBand;
  completeness: Completeness;
  factors: RiskFactor[];
  missing: string[];
  assessed_at: string;
  disclaimer: string;
}

// Mismatch between declared application purpose and requested permission
export interface MismatchFinding {
  permission: PermissionType;
  browser_setting: BrowserSetting;
  page_state: PageState;
  profile: PurposeProfile;
  rule_id: string;
  severity: Severity;
  explanation: string;
  reason?: string;
  limitation_note: string;
  provenance: Provenance;
}

// Full site assessment
export interface SiteAssessment {
  origin: string;
  purpose_profile: PurposeProfile;
  purpose_source: PurposeSource;
  mismatches: MismatchFinding[];
  risk: RiskAssessment | null;
  safety?: Safety;
}

// Site summary in listing
export interface SiteSummary {
  origin: string;
  display_name: string;
  purpose_profile: PurposeProfile;
  purpose_source: PurposeSource;
  purpose_confidence: PurposeConfidence;
  first_audited_at: string;
  last_audited_at: string;
  latest_observations?: PermissionObservation[];
  band: ScoreBand | null;
  score: number | null;
  completeness: Completeness | null;
  safety?: Safety; // Google Safe Browsing (backend); absent in demo data
  icon?: string;
  category_label?: string;
}

// Full site detail
export interface SiteDetail extends SiteSummary {
  observations: PermissionObservation[];
  actions: PermissionAction[];
  policy_findings: PolicyFinding[];
  assessment: SiteAssessment | null;
  policy_text?: string;
  declared_third_parties?: string[];
  data_collected?: string[];
}

// Data Exposure Map Types
export type ExposureNodeType = "identity" | "app" | "permission" | "data_type" | "third_party";

export interface ExposureNode {
  id: string;
  label: string;
  sublabel?: string;
  type: ExposureNodeType;
  icon?: string;
  riskBand?: ScoreBand;
  provenance: Provenance;
  details?: Record<string, any>;
  x?: number;
  y?: number;
}

export interface ExposureLink {
  source: string;
  target: string;
  label?: string;
  flowVolume?: "low" | "medium" | "high";
  severity?: "low" | "moderate" | "high";
  provenance: Provenance;
  active?: boolean;
}

export interface ExposureGraphData {
  nodes: ExposureNode[];
  links: ExposureLink[];
}

// Executive Audit Report Models
export interface AuditReport {
  id: string;
  title: string;
  generated_at: string;
  scope: string[];
  overall_score: number;
  overall_band: ScoreBand;
  sites_audited_count: number;
  total_mismatches_count: number;
  high_severity_count: number;
  policies_analyzed_count: number;
  top_findings: PolicyFinding[];
  key_recommendations: string[]; // from backend mismatch explanations and policy finding recommendations
  disclaimer: string;
  methodology: string;
}
