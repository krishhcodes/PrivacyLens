# ConsentScope — UX & Design Spec

## 1. Identity and direction
The look is a calm, paper-like **ledger**: closer to a well-kept account book than a hacker console. It uses warm neutrals, dark ink typography, monospace for evidence, and colour only where it means something. There is no neon, no glow, no glassmorphism and no decorative charts.

## 2. Tokens
| Token | Value | Use |
|---|---|---|
| `--paper` | #FAF7F2 | App background |
| `--card` | #FFFFFF | Surfaces |
| `--rule` | #E7E0D5 | Ledger lines and borders |
| `--ink` | #1F1B16 | Primary text |
| `--ink-2` | #5B544A | Secondary text |
| `--allow` | #B45309 (amber-700) on #FEF3C7 | "Allowed" (a sensitive allowed permission merits review, so this is not green) |
| `--high` | #B91C1C on #FEE2E2 | High severity |
| `--protect` | #15803D on #DCFCE7 | Blocked or a confirmed protective action |
| `--neutral` | #475569 on #F1F5F9 | Ask, unknown, unsupported |
| `--focus` | #2563EB | Focus ring (2px) |

Provenance badges are small, outlined and monospace: `OBSERVED` (ink), `POLICY` (indigo #4338CA), `INFERRED` (amber outline), `SIMULATED` (dashed slate border plus a striped background that cannot be missed), `UNKNOWN` (slate).

**Typography:** Inter (UI), JetBrains Mono (excerpts, timestamps, rule IDs). Scale: 12 / 14 / 16 / 20 / 28. Body text is 14 in the popup and 16 on the dashboard.
**Spacing:** a 4-px grid with 8/12/16/24 steps. Radius is 8. Shadows are none; separation comes from 1-px `--rule` lines.
**Icons (Lucide):** MapPin, Camera, Mic, Bell, ShieldCheck, ShieldOff, RotateCcw, FileText, Gauge, Download, ExternalLink.

## 3. Surfaces and why
- **Popup (360 × 560):** the fastest path to the answer and the action, while you are on the site. This is where the demo opens.
- **Dashboard (extension page `dashboard.html`, opened in a tab):** room for the policy analyzer, the history and the report. A side panel was rejected because it is extra API surface for no demo benefit.

## 4. Signature component: the Site Permission Ledger
One row per permission, laid out like a bookkeeping entry:

```
 ┌───────────────────────────────────────────────────────────────┐
 │ 📍 Location     Chrome: ALLOWED   Page: granted   11:42:07 OBSERVED │
 │   ⚠ Review — a calculator rarely needs your location (MIS-01)   [Block] [Reset to Ask] ↗ │
 ├───────────────────────────────────────────────────────────────┤
 │ 📷 Camera       Chrome: ASK       Page: prompt    11:42:07 OBSERVED │
 │ 🎙 Microphone   Chrome: ASK       Page: prompt    11:42:07 OBSERVED │
 │ 🔔 Notifications Chrome: BLOCKED  Page: denied    11:42:07 OBSERVED │
 │ 👥 Contacts     Not tracked — Chrome doesn't give websites contact access │
 └───────────────────────────────────────────────────────────────┘
```

- There are two state columns, and they are never merged. A tooltip explains the difference: "Chrome setting = your saved rule. Page state = what this page currently sees."
- Rows that changed after an action briefly flash a 600 ms `--protect` background, and the old value is shown struck through, e.g. "~~ALLOWED~~ → BLOCKED".
- The inline finding line appears only when a rule fired. Clicking it expands the rule, the profile, the reasoning and the "Inference" note.

## 5. Screens

### 5.1 Popup
Header: favicon + domain, "Audited 11:42", a backend status dot (green = analysis online, grey = offline).
Body: the Ledger. Below it, a **risk chip** ("Moderate · 38 · Partial") and the top two findings.
Footer: primary button **Open full audit**, secondary link **Analyze this site's policy**.

### 5.2 Dashboard: Sites
The left rail contains Sites, Policy Analyzer, Report and Settings. The Sites view is a table with origin, purpose, permissions allowed, band, last audit and a source tag ("visited" or "URL check only"). At the top is a "Check a URL" input. Empty state: "No sites audited yet. Open any site and click the ConsentScope icon."

### 5.3 Site detail
The full Ledger with an action history (before → after, time, Undo); a purpose profile select with an "Inferred (medium) — change" control; mismatch cards; policy findings for this site; and the score breakdown.

### 5.4 Policy Analyzer
Two panes. The left pane is a textarea with "Paste policy text" and a **Use current tab's text** button. The right pane shows the analyzed text with `<mark>` highlights coloured by category, and a findings list. Each finding card shows: category chip, rule ID, excerpt (mono, quoted), plain-language explanation, recommendation, and `POLICY` or `INFERRED – needs review`. Clicking a card scrolls the matching highlight into view.

### 5.5 Score breakdown (in Site detail and the Report)
The big number and band, then a factor table: Factor | Evidence (link to the row or excerpt) | Points | Provenance. Below that, "What we don't know" (missing[]) and the fixed disclaimer.

### 5.6 Report
A print-optimized single column with no colour dependence (badges also carry text), page breaks between sections, and an **Export / Print to PDF** button.

### 5.7 Settings & privacy
What we store; Clear this site / Clear everything (confirm dialog); backend URL; "Background monitoring: not enabled — requires access to all sites (not available in this version)"; extension permissions explained in plain words.

### 5.8 Onboarding (opens on install)
One screen with three short paragraphs: what we read, why Chrome warns about "change your settings", and that nothing leaves the computer. Button: **Got it**.

## 6. States
| State | Copy / behavior |
|---|---|
| Loading | Skeleton ledger rows. "Reading Chrome's settings…" |
| Can't inspect (chrome://, Web Store) | "Chrome doesn't let extensions inspect this page. Try it on a regular website." |
| Page state unavailable | Page column shows "—" with the tooltip "Couldn't run a check on this page". |
| Backend offline | Analysis panels: "Analysis service is offline. Your permission ledger still works. Start the backend to analyze policies." |
| Confirm block | Dialog: "Block location for pocketcalc.test? The site won't be able to ask again until you reset it." [Cancel] [Block location] |
| Success | Toast: "Location blocked and verified ✓  Undo (10s)" |
| Failure | Toast (red): "Couldn't change the setting: <error>. Nothing was changed." |
| Needs reload | "Saved. Reload the page for the site to see the change." [Reload] |
| Empty policy | "Paste at least one sentence of a privacy policy." |
| No findings | "No red-flag patterns matched. This doesn't mean the policy is safe — rules can miss things." |
| Simulated data | A striped banner at the top: "Demo data — not a real browser observation". |

## 7. Accessibility and responsiveness
- All controls are reachable by keyboard. Dialogs trap focus and close on Esc. There is a visible focus ring.
- Contrast is at least 4.5:1, and every colour state also carries a text label.
- Icons have `aria-label`s, and ledger rows are a `<table>` with headers.
- Dashboard breakpoints: at 1024 px or more, the rail plus content; below 1024 px, the rail collapses to top tabs. The popup is a fixed width and the ledger scrolls inside it.

## 8. Representative copy
- Tagline: "See what each site can access. Understand the risks. Take control."
- Finding: "This site is set up as a **calculator**, and it's **allowed to use your location**. Calculators rarely need location. *This is an inference from the site's purpose, not evidence of misuse.*"
- Policy: "**Sharing (explicit):** The policy says it shares data with advertising partners. Consider whether you're comfortable with ads being tailored using this site's data."
