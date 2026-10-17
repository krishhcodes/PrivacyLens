# ConsentScope extension (Chrome MV3, no build step)

Plain JavaScript modules, so there's nothing to compile.

**Install:** download the zip from the website's **Extension** tab (built from this folder on every website build), or open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and pick this `extension/` folder.

**Point it at a hosted backend:** edit `config.js` (`API_BASE`, `WEBSITE_URL`). If the host isn't `*.onrender.com`, add it to `host_permissions` in `manifest.json`. Then click the reload icon on the extension card.

**Automatic recording:** `watch.js` runs on every page and tells `sw.js` when the site's permission state changes (for example you click Allow on a location prompt). `sw.js` sends the site to the backend (`source: "auto_audit"`) only if something is allowed, blocked, granted or denied, so ordinary browsing is never recorded.

**Website control:** the PrivacyLens website (`frontend/`) can ask the extension to Block / Ask / Undo a permission. `bridge.js` runs on `http://localhost:*` and `http://127.0.0.1:*` pages and relays the request to `sw.js`, which sets the real Chrome setting, re-reads it and records the action and a re-audit in the backend. For a hosted website, add its origin to `content_scripts.matches` in `manifest.json` and to `WEBSITE_ORIGINS` in `config.js`, then reload the extension.

**Files**
- `bridge.js`: content script on the website; relays its requests to `sw.js`.
- `sw.js`: handles website requests (only from allowed origins, only location/camera/microphone/notifications).
- `chrome.js`: reads and changes Chrome settings and page state. Works with no backend.
- `api.js`: calls the backend.
- `popup.js`: the ledger, Block / Reset / Undo with recheck, the risk chip and mismatches.

**Verified in Chromium 141 against `demo-site/`**
- `chrome.contentSettings.location` is the correct name. The handoff's `geolocation` would fail.
- **S-1:** setting `allow` makes the page report `granted`.
- **S-2:** `block` flips the open page to `denied` with no reload.

**Debugging:** open `popup.html?tabId=<id>` in a tab to audit a specific tab.
