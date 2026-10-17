# ConsentScope — Demo Plan

## Narrative (3 minutes)
"PocketCalc is a free calculator. Six months ago you clicked 'Allow' on something and forgot. Let's see what it holds, why that matters, and take it back."

## Preconditions
- Chrome 120+ on the demo laptop, with a dedicated demo profile (no other extensions).
- Location permission allowed at OS level for Chrome.
- Three terminals: backend, demo site, extension build.
- The demo site's location permission is reset before going on stage (`chrome://settings/content/location`).

## Run commands (to be confirmed in S0 and copied into the README)
- Backend: `cd backend && pip install -r requirements.txt && uvicorn app.main:app --host 127.0.0.1 --port 8000`
- Demo site: `cd demo-site && python -m http.server 5500`
- Extension: `cd extension && npm i && npm run build`, then go to chrome://extensions → Developer mode → Load unpacked → `extension/dist`

## Test site: PocketCalc (`http://localhost:5500`)
- The title is "PocketCalc — Simple Calculator", so purpose inference gives `calculator`.
- A "📍 Find my local tax rate" button calls `navigator.geolocation.getCurrentPosition` only on click. The coordinates are shown on the page and **never sent anywhere**.
- An optional "📷 Scan receipt" button calls `getUserMedia({video:true})` and stops the stream immediately.
- A footer link opens `policy.html`, a short sample policy containing collection, sharing ("we share with advertising partners"), retention ("as long as necessary") and a deletion-request sentence, plus one hedged "may" sentence.

## Script and expected results
| Step | Action | Expected on screen |
|---|---|---|
| 1 | Open PocketCalc, open the popup | Ledger: all rows `ASK / prompt`. Risk chip: "Low · 0 · Partial". |
| 2 | Click "Find my local tax rate" → Allow | — |
| 3 | Reopen the popup | Location `ALLOWED / granted`, timestamp, OBSERVED. Inline ⚠ "Calculators rarely need your location (MIS-01) — Inference". |
| 4 | Expand the finding | Rule, profile "calculator (inferred, medium)", reasoning, limitation note. |
| 5 | Click **Block** → confirm | Row flips to ~~ALLOWED~~ → BLOCKED, toast "verified ✓ Undo". Clicking the page button now fails with "denied". |
| 6 | Click "Analyze this site's policy" → paste the policy.html text → Analyze | Highlights plus cards: sharing (explicit), retention (needs review), deletion (positive), collection. |
| 7 | Open Site detail → score | Factor table: the mismatch factor is gone (blocked), the policy sharing and retention factors remain, "Complete", with an evidence link on each factor. |
| 8 | Export report → Print preview | Ledger, the block action before → after, findings, score, limitations. |

## Fallbacks
- **Prompt doesn't appear / OS location blocked:** use the camera button, or pre-grant before going on stage and start from step 3.
- **contentSettings and page state disagree:** that is a talking point. "We show both; Chrome's saved rule and what the page sees are different facts."
- **Page doesn't see Reset/Block until reload:** click the "Reload page" CTA (built into S2).
- **Backend crashes:** the ledger and Block still work (the offline dot is shown). Skip to the recorded video for steps 6–8.
- **Total failure:** the 60-s screen recording from S6. If simulated data is ever used, the striped "Demo data — not a real browser observation" banner stays visible.

## Judge-facing summary
**Impact:** ConsentScope turns invisible site permissions into a readable ledger, explains *why* a grant is questionable with traceable rules, translates policy legalese into evidence-backed findings, and lets you revoke access in one verified click. Everything runs locally, with no accounts and no data leaving the machine.
**Honest limits:** it covers websites in Chrome, not phone apps. It shows current settings, not a history of past grants (we record history only from install onward). There is no background monitoring across all sites without broader access we deliberately don't request. Policy analysis is pattern-based, not legal advice, and a policy statement is not proof of what a site actually does.
