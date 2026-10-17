"""Pydantic models mirroring contracts/API_CONTRACT.md and the extension's types.ts."""
from typing import Literal, Optional, Union, get_args

from pydantic import BaseModel, ConfigDict, Field

PermissionType = Literal["location", "camera", "microphone", "notifications"]
# Extra types only the local scanner reports. Shown in the ledger; not scored and not actionable.
ExtraPermissionType = Literal["popups", "clipboard", "sensors", "automatic_downloads", "midi_sysex", "usb", "serial", "hid", "bluetooth", "file_system_write", "window_management", "idle_detection", "local_fonts", "ar", "vr", "protected_media", "background_sync", "payment_handler", "storage_access"]
ObservedPermission = Union[PermissionType, ExtraPermissionType]
BrowserSetting = Literal["allow", "block", "ask", "unsupported", "unknown"]
PageState = Literal["granted", "denied", "prompt", "unavailable", "not_checked"]
Provenance = Literal["observed", "policy_declared", "inferred", "simulated", "unknown"]
Severity = Literal["info", "review", "high"]
PolicyCategory = Literal["collection", "sharing", "sale", "retention", "deletion", "vague"]
PurposeProfile = Literal["calculator", "video_meeting", "maps", "weather", "general"]
PurposeSource = Literal["inferred", "user"]
PurposeConfidence = Literal["low", "medium", "high"]
ScoreBand = Literal["low", "moderate", "elevated", "high"]
Completeness = Literal["full", "partial"]
AuditSource = Literal["popup_audit", "manual_url", "post_action_recheck", "simulated", "local_scan", "auto_audit"]
ActionType = Literal["block", "reset_ask", "undo"]
EvidenceType = Literal["explicit_statement", "keyword_match_review"]

PERMISSIONS: tuple[str, ...] = ("location", "camera", "microphone", "notifications")
ALL_PERMISSIONS: tuple[str, ...] = PERMISSIONS + get_args(ExtraPermissionType)


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


# ---------- shared ----------
class PermissionObservation(BaseModel):
    id: Optional[str] = None
    permission: ObservedPermission
    browser_setting: BrowserSetting
    page_state: PageState = "not_checked"
    observed_at: Optional[str] = None  # server fills in if missing
    setting_changed_at: Optional[str] = None  # when the browser last changed this rule (local scanner only)
    source: Optional[AuditSource] = None
    provenance: Optional[Provenance] = None  # server decides: observed | simulated


class PermissionAction(BaseModel):
    id: str
    permission: PermissionType
    action: ActionType
    before_setting: BrowserSetting
    after_setting: BrowserSetting
    succeeded: bool
    error: Optional[str] = None
    acted_at: str


class PolicyFinding(BaseModel):
    id: str
    origin: Optional[str]
    excerpt: str
    char_start: int
    char_end: int
    category: PolicyCategory
    rule_id: str
    explanation: str
    recommendation: str
    evidence_type: EvidenceType
    provenance: Provenance


class RiskFactor(BaseModel):
    factor_id: str
    label: str
    points: int
    provenance: Provenance
    evidence_refs: list[str]
    explanation: str


class RiskAssessment(BaseModel):
    score: int
    band: ScoreBand
    completeness: Completeness
    factors: list[RiskFactor]
    missing: list[str]
    assessed_at: str
    disclaimer: str


class MismatchFinding(BaseModel):
    permission: PermissionType
    browser_setting: BrowserSetting
    page_state: PageState
    profile: PurposeProfile
    rule_id: str
    severity: Severity
    explanation: str
    limitation_note: str
    provenance: Provenance


SafetyStatus = Literal["safe", "unsafe", "not_checked", "not_applicable", "error"]


class Safety(BaseModel):
    """Google Safe Browsing result for the site (cached 24 h). not_checked = no API key set or not checked yet;
    not_applicable = local/private address, never sent to Google."""
    status: SafetyStatus
    threats: list[str] = []
    checked_at: Optional[str] = None


NOT_CHECKED = {"status": "not_checked", "threats": [], "checked_at": None}


class SiteAssessment(BaseModel):
    origin: str
    purpose_profile: PurposeProfile
    purpose_source: PurposeSource
    mismatches: list[MismatchFinding]
    risk: Optional[RiskAssessment]
    safety: Safety = Safety(**NOT_CHECKED)


class SiteSummary(BaseModel):
    origin: str
    display_name: str
    purpose_profile: PurposeProfile
    purpose_source: PurposeSource
    purpose_confidence: PurposeConfidence
    first_audited_at: Optional[str]
    last_audited_at: Optional[str]
    latest_observations: list[PermissionObservation]
    band: Optional[ScoreBand]
    score: Optional[int]
    completeness: Optional[Completeness]
    safety: Safety = Safety(**NOT_CHECKED)


class SiteDetail(SiteSummary):
    observations: list[PermissionObservation]
    actions: list[PermissionAction]
    policy_findings: list[PolicyFinding]
    assessment: Optional[SiteAssessment]


class SitesList(BaseModel):
    sites: list[SiteSummary]


# ---------- requests ----------
class AuditRequest(Strict):
    origin: str = Field(description="Any http(s) URL or origin; normalized server-side.")
    source: AuditSource = "popup_audit"
    page_title: Optional[str] = Field(default=None, max_length=500, description="tab.title; improves purpose inference.")
    observations: list[PermissionObservation] = Field(min_length=1, max_length=40)


class AuditResponse(BaseModel):
    origin: str
    created: bool
    purpose_profile: PurposeProfile
    purpose_source: PurposeSource
    purpose_confidence: PurposeConfidence
    saved: int = 0
    deduplicated: int = 0


class ActionRequest(Strict):
    origin: str
    permission: PermissionType
    action: ActionType
    before_setting: BrowserSetting
    after_setting: BrowserSetting
    succeeded: bool
    error: Optional[str] = Field(default=None, max_length=2000)
    acted_at: Optional[str] = None


class PolicyAnalyzeRequest(Strict):
    text: str = Field(max_length=200_000)
    origin: Optional[str] = None


class PolicyAnalyzeResponse(BaseModel):
    origin: Optional[str]
    finding_count: int
    findings: list[PolicyFinding]


class PurposeUpdateRequest(Strict):
    purpose_profile: PurposeProfile


class PurposeUpdateResponse(BaseModel):
    origin: str
    purpose_profile: PurposeProfile
    purpose_source: PurposeSource
    purpose_confidence: PurposeConfidence


class DeleteResponse(BaseModel):
    deleted: int


class Health(BaseModel):
    status: Literal["ok"]
    version: str
    auth: Literal["local", "supabase"] = "local"  # "supabase": every other endpoint needs a sign-in token


class Me(BaseModel):
    user_id: str
    email: str | None = None
    auth: Literal["local", "supabase"]


class DeviceTokenRequest(BaseModel):
    label: str = Field("Device", min_length=1, max_length=60)


class DeviceToken(BaseModel):
    id: str
    label: str
    created_at: str
    last_used_at: str | None = None


class DeviceTokenCreated(DeviceToken):
    token: str = Field(description="Shown once. Paste it into the scanner, or the website hands it to the extension.")


class DeviceTokenList(BaseModel):
    tokens: list[DeviceToken]


class ReportLink(BaseModel):
    url: str = Field(description="Path on this API (append to the API base); valid for 10 minutes.")
