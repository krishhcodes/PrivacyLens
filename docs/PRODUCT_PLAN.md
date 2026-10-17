# ConsentScope — Product Plan (4-hour hackathon edition)

> "See what each site can access. Understand the risks. Take control."

## 1. Constraints that shape this plan

| Constraint | Source | Consequence |
|---|---|---|
| 4-hour build | Team | Five thin vertical slices. Each one ends in a demoable state. |
| Frontend and backend built separately | Team | Two codebases (`extension/` and `backend/`) joined by a JSON contract that is frozen in the first 20 minutes. |
| Must be presentable at any point | Team | Every slice ends with a working demo. Later slices only add to it. The extension must still work if the backend is down. |
| Most fundamental feature first | Team | Order: **see permissions → change permissions → read policy → explain risk → export**. |
| Chrome extension, website privacy only | Master prompt | No claims about Android or iOS app permissions. |
| No paid or external AI APIs | Master prompt | All analysis is deterministic rules running on a **local** backend (`localhost`). |

## 2. Problem interpretation

People grant sites camera, microphone, location and notification access, then forget about it. Privacy policies are too long to read. ConsentScope answers three questions for the site in front of you:

1. **What can this site access right now?** → Site Permission Ledger
2. **Should I worry, and why?** → purpose mismatch, policy red flags and an explainable score
3. **How do I take it back?** → one-click Block or Reset to Ask, rechecked, plus an exportable report

## 3. Target users and pain points

- **Everyday browser user.** Does not know which sites hold camera or location access. Chrome's settings are buried several menus deep.
- **Privacy-curious student or parent.** Wants a plain-language reading of a policy without legal jargon.
- **Pain points:** the information is invisible, the policies are unreadable, and there is no single place to act.

## 4. Requirements traceability

| Problem-statement requirement (explicit) | ConsentScope feature | Slice |
|---|---|---|
| "no clue who holds what" | Site Permission Ledger (current site plus history of audited sites) | S1 |
| "permissions to contacts, location, camera and more" | Ledger covers location, camera, microphone and notifications. Contacts are shown as *not available to websites in Chrome*, which is the honest answer. | S1 |
| "means to take back control" | Block / Reset to Ask with recheck and undo | S2 |
| "privacy policies are long and unreadable" | Policy Red-Flag Analyzer with sentence-level evidence | S3 |
| "clarity on what they have shared" | Purpose mismatch and an explainable risk score | S4 |
| (inferred judging priority) shareable evidence | Audit report export | S5 |

**Product decisions (not required by the problem statement):** separate local backend, risk score bands, purpose profiles, and the calculator demo site.
**Assumptions:** a greenfield repository, a team of 2–4 people split into frontend and backend, a laptop running Chrome 120+, and Python 3.11+ and Node 20+ available.

## 5. Scope by priority

| Priority | Feature | In 4 h? |
|---|---|---|
| P0 | Current-site permission ledger (browser setting plus page-context state) | Yes (S1) |
| P0 | Block / Reset to Ask, recheck, undo, action log | Yes (S2) |
| P0 | Policy analyzer (paste, plus "grab text from this tab") | Yes (S3). Paste is mandatory; grab is a stretch. |
| P0 | Purpose mismatch and explainable score | Yes (S4) |
| P1 | Audit report export (print-to-PDF HTML) | Yes (S5) |
| P1 | Manual URL audit (reads Chrome settings for any URL, without visiting it) | Yes, small (S2 stretch) |
| P2 | Data exposure map | **Cut** unless done by 3:30 |
| Out | Background monitoring across all sites (`<all_urls>`) | Out. Documented as future work. |

## 6. User stories and acceptance criteria

| # | Story | Acceptance criteria |
|---|---|---|
| U1 | As a user, I open the popup and see what this site can access. | The popup shows the domain and four permission rows. Each row shows a **Chrome setting** (Allowed / Blocked / Ask) and a **page state** (granted / denied / prompt / n/a) with a timestamp and a provenance badge. "Ask" is never displayed as granted. |
| U2 | As a user, I block a permission. | A confirmation dialog appears, then the setting changes, the ledger rechecks automatically, a green success message appears with **Undo**, and the action is logged. |
| U3 | As a user, I reset a permission to Ask. | Same as U2, with the resulting state shown as "Ask". |
| U4 | As a user, I paste a privacy policy and get red flags. | Each finding shows the exact sentence, its category, a plain-language explanation, a recommendation, and whether it is an explicit statement or a keyword match that needs review. Empty input shows a helpful empty state. |
| U5 | As a user, I see why a permission is questionable for this site. | Each mismatch card shows the permission and state, the purpose profile (editable), the rule ID, the reasoning, the severity, and an "Inference" badge. |
| U6 | As a user, I see a risk score I can trust. | The score breakdown lists each factor with its evidence, points and provenance. Missing data is listed. With no policy analyzed, the score is labelled "Partial". |
| U7 | As a user, I export a report. | A printable report includes the site, date, ledger, actions with before/after values, findings, the score breakdown and limitations. |
| U8 | As a user, I clear my data. | Settings → Clear removes both extension storage and backend records for the site, or for all sites. |

## 7. Main workflow

Install → short honest onboarding ("we read Chrome's site settings; nothing leaves your computer") → open a site → open the popup → see the ledger → open a finding → Block (confirm, recheck, undo) → open the dashboard → paste or grab the policy → see the findings → review the score → export the report.

**Manual URL audit:** the dashboard has a "Check a URL" box. It reads Chrome's stored setting for that URL only, and the result is labelled **"Chrome setting only — page not visited, page state unknown."**
