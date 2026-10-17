import { PERMS, normalizeOrigin, readSetting, setSetting } from "./chrome.js";
import { postAction, postAudit } from "./api.js";
import { WEBSITE_ORIGINS } from "./config.js";

// Say hello on install. No background monitoring (see TECHNICAL_ARCHITECTURE §2).
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") chrome.tabs.create({ url: "popup.html?welcome=1" });
});

const DEV_SITE = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const SETTINGS = ["allow", "block", "ask"];
const ACTIONS = ["block", "reset_ask", "undo"];

function trustedWebsite(sender) {
  const origin = sender.origin || (sender.url ? new URL(sender.url).origin : "");
  return sender.id === chrome.runtime.id && (DEV_SITE.test(origin) || WEBSITE_ORIGINS.includes(origin));
}

// Website bridge (bridge.js): the PrivacyLens website asks the extension to change a real Chrome setting.
// Same flow as the popup: set → re-read → log the action → re-audit with the re-read value.
async function changePermission({ origin: rawOrigin, permission, setting, action }) {
  const origin = normalizeOrigin(rawOrigin);
  if (!PERMS.includes(permission)) throw new Error(`Unsupported permission: ${permission}`);
  if (!SETTINGS.includes(setting)) throw new Error(`Unsupported setting: ${setting}`);
  const actionType = ACTIONS.includes(action) ? action : setting === "block" ? "block" : "reset_ask";

  const before = await readSetting(origin, permission);
  let error;
  try { await setSetting(origin, permission, setting); } catch (e) { error = e.message; }
  const after = await readSetting(origin, permission);
  const succeeded = !error && after === setting;

  // The browser change already happened; backend logging failures are reported, not fatal.
  let backendError;
  try {
    await postAction({ origin, permission, action: actionType, before_setting: before, after_setting: after,
      succeeded, error: error || undefined, acted_at: new Date().toISOString() });
    await postAudit({ origin, source: "post_action_recheck",
      observations: [{ permission, browser_setting: after, page_state: "not_checked" }] });
  } catch (e) { backendError = e.message; }

  return { ok: succeeded, before, after, error: error || (succeeded ? undefined : `Chrome reports "${after}" after the change`), backendError };
}

// Automatic audit (watch.js): a page loaded or one of its permission states changed.
// Recorded only if something is allowed/blocked in Chrome or granted/denied on the page, and only when
// it differs from what was last sent for that site. Sites with nothing set are never sent.
const PAGE_STATES = ["granted", "denied", "prompt"];
async function autoAudit(sender, { title, states = {} }) {
  if (!sender.tab || sender.frameId !== 0 || !sender.url) return;
  let origin;
  try { origin = normalizeOrigin(sender.url); } catch { return; }
  const observations = await Promise.all(PERMS.map(async (permission) => ({
    permission,
    browser_setting: await readSetting(origin, permission),
    page_state: PAGE_STATES.includes(states[permission]) ? states[permission] : "unavailable",
  })));
  const key = `auto:${origin}`;
  const signature = JSON.stringify(observations);
  const { [key]: last } = await chrome.storage.local.get(key);
  if (last === signature) return;
  const notable = observations.some((o) => o.browser_setting === "allow" || o.browser_setting === "block"
    || o.page_state === "granted" || o.page_state === "denied");
  // Report a site the first time it has something set, and keep reporting it once known (so resets are seen).
  if (!notable && last === undefined) return;
  try {
    await postAudit({ origin, source: "auto_audit", page_title: (title || "").slice(0, 500) || undefined, observations });
    await chrome.storage.local.set({ [key]: signature });
  } catch { /* backend offline: try again on the next change or visit */ }
}

// Account link (website bridge): after you sign in, the website gives the extension its own device token.
// Switching or clearing the account also forgets which sites were already sent, so the new account gets them.
async function forgetSentSites() {
  const all = await chrome.storage.local.get(null);
  await chrome.storage.local.remove(Object.keys(all).filter((k) => k.startsWith("auto:")));
}

async function accountLink(type, payload) {
  const { account } = await chrome.storage.local.get("account");
  if (type === "getLink") {
    return { ok: true, linked: Boolean(account?.token), userId: account?.userId, tokenId: account?.tokenId, email: account?.email };
  }
  if (type === "setLink") {
    const { token, tokenId, userId, email } = payload;
    if (typeof token !== "string" || !token.startsWith("cs_") || typeof userId !== "string") throw new Error("Invalid account link");
    if (account?.userId !== userId) await forgetSentSites();
    await chrome.storage.local.set({ account: { token, tokenId, userId, email: email ?? null } });
    return { ok: true };
  }
  await chrome.storage.local.remove("account");
  await forgetSentSites();
  return { ok: true };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "pageStates" && sender.id === chrome.runtime.id) {
    autoAudit(sender, msg.payload || {});
    return false;
  }
  if (!msg || !["ping", "setPermission", "getLink", "setLink", "clearLink"].includes(msg.type)) return false;
  if (!trustedWebsite(sender)) {
    sendResponse({ ok: false, error: "This website is not allowed to control ConsentScope." });
    return false;
  }
  if (msg.type === "ping") {
    sendResponse({ ok: true, version: chrome.runtime.getManifest().version });
    return false;
  }
  if (msg.type !== "setPermission") {
    accountLink(msg.type, msg.payload || {})
      .then(sendResponse)
      .catch((e) => sendResponse({ ok: false, error: e.message }));
    return true;
  }
  changePermission(msg.payload || {})
    .then(sendResponse)
    .catch((e) => sendResponse({ ok: false, error: e.message }));
  return true; // async response
});
