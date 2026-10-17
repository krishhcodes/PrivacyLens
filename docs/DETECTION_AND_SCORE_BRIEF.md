# ConsentScope: what we can detect, the limits, and how the score works

## 1. What the extension can detect, and how

| What | How (Chrome API) | Notes |
|---|---|---|
| **Chrome's saved rule for this site** for location, camera, microphone and notifications: Allow / Block / Ask | `chrome.contentSettings.<type>.get({primaryUrl})` | Works for any http(s) URL, even one you aren't visiting. |
| **What the open page currently sees**: granted / denied / prompt | We inject a tiny fixed function into the tab (`chrome.scripting.executeScript`) that calls `navigator.permissions.query()` | Needs the tab open, and the user clicks the icon (`activeTab`). |
| **Which site you're on** | `chrome.tabs.query` with `activeTab` | Only when you click the icon. |
| **The privacy policy text** | The user pastes it, or we read `document.body.innerText` from the tab | Read only on click. |
| **Changing a permission** (Block, Reset to Ask, Undo) | `chrome.contentSettings.<type>.set(...)`, then we re-read to verify | We log the value we read back, not the one we asked for. |

We deliberately ask for only 4 permissions: `contentSettings`, `activeTab`, `scripting`, `storage`. No `<all_urls>`, history or tabs access.

## 2. Limits, and what we do about each

| Limit | Workaround |
|---|---|
| Chrome **doesn't record when** a site was granted access, so there's no history. | None possible. We record when *we* looked ("Observed 11:42") and never claim "granted on…". |
| **No Chrome-wide event** fires when a site gets a permission. | We re-check every time the popup opens and after every action. Background monitoring would need "read all your data on all websites", which is why it's out of scope. |
| The Chrome rule and the page state **can disagree**, e.g. Chrome says "Ask" but the page already holds a grant from earlier (risk S-1). | We show both columns side by side and never merge them. If S-1 fails, the page column becomes the main "granted" signal. |
| After a Block, the open page may not notice until it reloads (S-2). | We show "Reload the page to apply" with a Reload button. |
| We **can't inject into** `chrome://` pages, the Web Store or the PDF viewer. | We show "Can't inspect this page". Chrome's saved rule is still read where the URL is valid. |
| Contacts, USB, Bluetooth and similar aren't covered. | Rows show "Not tracked". They are never shown as "safe". |
| Rules set by an extension override the user's own setting, and `clear()` wipes **all** our rules. | We set and undo one site and one permission at a time, and never call `clear()`. |
| We **can't see what a site does** with data (whether it actually sends your location anywhere). | None. Mismatches are labelled "Inference: based on the site's assumed purpose, not on observed data use." |
| Policy reading is **regex rules, not real understanding** (no AI, by design). | Hedged wording is marked "needs review". Negations like "we do not sell" are guarded. When nothing matches we say "rules can miss things". |
| A site's purpose is **guessed** from keywords in its hostname and title (calc, meet, maps, weather). | The guess is shown with its confidence. The user can correct it, and a user's choice always wins. |

## 3. The score (0–100, "indicative privacy exposure")

Points are added up and capped at 100. Every point links back to an observation or a policy sentence.

| Factor | Points | Evidence type |
|---|---|---|
| Camera, mic or location allowed | 12 each | Observed |
| Notifications allowed | 4 | Observed |
| Permission doesn't fit the site's purpose, **high** (e.g. a calculator with location) | 20, *replaces* the base points | Inferred |
| Permission doesn't fit the site's purpose, **review** | 8, *replaces* the base points | Inferred |
| Policy says it sells data | 18, counted once | Policy |
| Policy says it shares with third parties or advertisers | 12, counted once | Policy |
| Retention vague or indefinite ("as long as necessary") | 8 | Policy or inferred |
| No way to delete your data found in the policy | 8 | Inferred |

Bands: 0–24 Low, 25–49 Moderate, 50–74 Elevated, 75+ High. With no policy analyzed the score is marked **Partial**, and with no observations there is no score at all.
Demo: calculator with location allowed = 20 (Low, Partial). Add its policy = 40 (Moderate). Block location = 20.

## 4. How reliable is it?

- **The permission columns are reliable.** They are Chrome's own answer at the moment shown. The only open question is spike S-1, the Chrome-vs-page mismatch above, which needs a quick check on a real browser.
- **The mismatches are educated guesses.** They depend on the purpose guess, which is only keyword-based. A wrong guess gives a wrong mismatch until the user corrects it.
- **The policy findings are good at obvious phrases** ("we sell", "share with advertising partners") and weak at clever wording. They can miss things and occasionally misfire. Each one shows the exact sentence so the user can judge.
- **The score is a heuristic, not a measurement.** The weights are hand-picked judgement calls, not tuned on any data, and nothing has been validated against real outcomes. It's a way to rank and explain, so read it as "how much deserves a look", not "how dangerous". That's why every screen carries: *"Indicative exposure, not a security rating, legal finding or proof of misuse."*
