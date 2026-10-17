// Wire types for the ConsentScope backend. Copied from contracts/types.ts (source of truth: backend/app/models.py).
// Keep in sync with contracts/types.ts; do not add UI-only fields here (those live in src/types/privacy.ts).
export type PermissionType = "location" | "camera" | "microphone" | "notifications";
// Only the local scanner reports these. Shown in the ledger; not scored and not actionable.
export type ExtraPermissionType = "popups" | "clipboard" | "sensors" | "automatic_downloads" | "midi_sysex" | "usb" | "serial" | "hid" | "bluetooth" | "file_system_write" | "window_management" | "idle_detection" | "local_fonts" | "ar" | "vr" | "protected_media" | "background_sync" | "payment_handler" | "storage_access";
export type ObservedPermission = PermissionType | ExtraPermissionType;
export type BrowserSetting = "allow" | "block" | "ask" | "unsupported" | "unknown";
export type PageState = "granted" | "denied" | "prompt" | "unavailable" | "not_checked";
export type Provenance = "observed" | "policy_declared" | "inferred" | "simulated" | "unknown";
export type Severity = "info" | "review" | "high";
export type PolicyCategory = "collection" | "sharing" | "sale" | "retention" | "deletion" | "vague";
export type PurposeProfile = "calculator" | "video_meeting" | "maps" | "weather" | "general";
export type PurposeSource = "inferred" | "user";
export type PurposeConfidence = "low" | "medium" | "high";
export type ScoreBand = "low" | "moderate" | "elevated" | "high";
export type Completeness = "full" | "partial";
export type AuditSource = "popup_audit" | "manual_url" | "post_action_recheck" | "simulated" | "local_scan" | "auto_audit";
export type ActionType = "block" | "reset_ask" | "undo";

// One row in the ledger
export interface PermissionObservation {
  id?: string;
  permission: ObservedPermission;
  browser_setting: BrowserSetting;
  page_state: PageState;
  observed_at: string;          // ISO-8601 UTC
  setting_changed_at?: string | null; // when the browser last changed this rule (local scanner only)
  source?: AuditSource;
  provenance: Provenance;
}

// What the popup builds locally (never from the backend)
export interface LocalLedger {
  origin: string;
  observed_at: string;
  observations: PermissionObservation[];
}

// Backend models
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
}

export interface RiskFactor {
  factor_id: string;
  label: string;
  points: number;
  provenance: Provenance;
  evidence_refs: string[];
  explanation: string;
}

export interface RiskAssessment {
  score: number;
  band: ScoreBand;
  completeness: Completeness;
  factors: RiskFactor[];
  missing: string[];
  assessed_at: string;
  disclaimer: string;
}

export interface MismatchFinding {
  permission: PermissionType;
  browser_setting: BrowserSetting;
  page_state: PageState;
  profile: PurposeProfile;
  rule_id: string;
  severity: Severity;
  explanation: string;
  limitation_note: string;
  provenance: Provenance;
}

// Google Safe Browsing result (cached 24 h). not_checked: no API key or not checked yet; not_applicable: local address.
export type SafetyStatus = "safe" | "unsafe" | "not_checked" | "not_applicable" | "error";
export interface Safety { status: SafetyStatus; threats: string[]; checked_at: string | null; }

export interface SiteAssessment {
  origin: string;
  purpose_profile: PurposeProfile;
  purpose_source: PurposeSource;
  mismatches: MismatchFinding[];
  risk: RiskAssessment | null;
  safety: Safety;
}

export interface SiteSummary {
  origin: string;
  display_name: string;
  purpose_profile: PurposeProfile;
  purpose_source: PurposeSource;
  purpose_confidence: PurposeConfidence;
  first_audited_at: string;
  last_audited_at: string;
  latest_observations: PermissionObservation[];
  band: ScoreBand | null;
  score: number | null;
  completeness: Completeness | null;
  safety: Safety;
}

export interface SiteDetail extends SiteSummary {
  observations: PermissionObservation[];
  actions: PermissionAction[];
  policy_findings: PolicyFinding[];
  assessment: SiteAssessment | null;
}

// ---- Request / response bodies (see API_CONTRACT.md) ----
export interface AuditRequest {
  origin: string;                 // any http(s) URL; normalized server-side
  source?: AuditSource;           // default "popup_audit"
  page_title?: string;            // tab.title, improves purpose inference
  observations: Pick<PermissionObservation, "permission" | "browser_setting" | "page_state" | "observed_at" | "source" | "setting_changed_at">[];
}
export interface AuditResponse {
  origin: string;
  created: boolean;
  purpose_profile: PurposeProfile;
  purpose_source: PurposeSource;
  purpose_confidence: PurposeConfidence;
  saved: number;
  deduplicated: number;
}
export interface ActionRequest {
  origin: string;
  permission: PermissionType;
  action: ActionType;
  before_setting: BrowserSetting;
  after_setting: BrowserSetting;  // the RECHECKED value
  succeeded: boolean;
  error?: string;
  acted_at?: string;
}
export interface PolicyAnalyzeResponse { origin: string | null; finding_count: number; findings: PolicyFinding[]; }
export interface PurposeUpdateResponse { origin: string; purpose_profile: PurposeProfile; purpose_source: PurposeSource; purpose_confidence: PurposeConfidence; }
export interface DeleteResponse { deleted: number; }
export interface ApiError { detail: string; }
