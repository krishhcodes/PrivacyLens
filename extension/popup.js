import * as api from "./api.js";
import { WEBSITE_URL } from "./config.js";
import { PERMS, cacheLedger, getCachedLedger, normalizeOrigin, readAllSettings, readPageStates, setSetting } from "./chrome.js";

const ICON = { location: "📍", camera: "📷", microphone: "🎙", notifications: "🔔" };
const LABEL = { location: "Location", camera: "Camera", microphone: "Microphone", notifications: "Notifications" };
const $ = (s) => document.querySelector(s);

function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "class") el.className = v;
    else el.setAttribute(k, v);
  }
  for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}
const fill = (el, ...kids) => el.replaceChildren(...kids.flat(Infinity).filter((c) => c != null && c !== false));
const chip = (s) => h("span", { class: `chip s-${s}` }, s === "allow" ? "ALLOWED" : s === "block" ? "BLOCKED" : s.toUpperCase());
const time = (iso) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

let tab, origin, ledger = [], mismatches = {}, previous = {}, online = false;

function toast(msg, { error = false, undo = null } = {}) {
  const t = $("#toast");
  fill(t, h("span", {}, msg));
  t.className = "toast" + (error ? " error" : "");
  t.hidden = false;
  if (undo) {
    let left = 10;
    const btn = h("button", { class: "small" }, `Undo (${left}s)`);
    const iv = setInterval(() => { left--; btn.textContent = `Undo (${left}s)`; if (left <= 0) { clearInterval(iv); t.hidden = true; } }, 1000);
    btn.addEventListener("click", () => { clearInterval(iv); t.hidden = true; undo(); });
    t.append(btn);
  } else setTimeout(() => (t.hidden = true), 4000);
}

function confirmBox(text, ok) {
  return new Promise((resolve) => {
    $("#confirm-text").textContent = text;
    $("#confirm-ok").textContent = ok;
    $("#confirm").hidden = false;
    const done = (v) => { $("#confirm").hidden = true; resolve(v); };
    $("#confirm-ok").onclick = () => done(true);
    $("#confirm-cancel").onclick = () => done(false);
  });
}

async function readLedger() {
  const [settings, states] = await Promise.all([readAllSettings(origin), readPageStates(tab.id)]);
  const at = new Date().toISOString();
  return PERMS.map((p) => ({ permission: p, browser_setting: settings[p], page_state: states[p], observed_at: at, provenance: "observed" }));
}

function render() {
  const rows = PERMS.map((p) => {
    const o = ledger.find((x) => x.permission === p);
    if (!o) return null;
    const m = mismatches[p];
    const canAct = o.browser_setting !== "unsupported";
    return h("div", { class: "lrow", id: `row-${p}` },
      h("div", { class: "top" },
        h("span", { class: "perm" }, `${ICON[p]} ${LABEL[p]}`),
        h("span", { class: "vals" },
          previous[p] ? h("s", { class: "muted mono" }, previous[p].toUpperCase()) : null,
          h("span", { title: "Chrome setting = your saved rule" }, chip(o.browser_setting)),
          h("span", { class: "muted", title: o.page_state === "unavailable" ? "Couldn't run a check on this page" : "Page state = what this page currently sees" },
            o.page_state === "unavailable" ? "—" : o.page_state),
          h("span", { class: "mono muted" }, time(o.observed_at)))),
      m ? h("div", { class: "why" }, `⚠ ${m.severity === "high" ? "High — review" : "Review"}: ${m.explanation} (${m.rule_id})`) : null,
      canAct ? h("div", { class: "btns" },
        h("button", { class: "small", disabled: o.browser_setting === "block", onclick: () => change(p, "block") }, "Block"),
        h("button", { class: "small", disabled: o.browser_setting === "ask", onclick: () => change(p, "ask") }, "Reset to Ask"),
        h("button", { class: "small", title: "Open in Chrome settings", onclick: () => chrome.tabs.create({ url: `chrome://settings/content/siteDetails?site=${encodeURIComponent(origin)}` }) }, "↗")) : null);
  });
  fill($("#ledger"), rows, h("div", { class: "notrack" }, "👥 Contacts, USB, Bluetooth: not tracked here. The local scanner lists saved USB and Bluetooth rules."));
}

async function analysis() {
  online = await api.checkHealth();
  $("#dot").className = "dot" + (online ? " on" : "");
  $("#dot").title = online ? "Analysis service online" : "Analysis service offline";
  if (!online) {
    fill($("#risk"), h("p", { class: "offline" }, "Analysis service is offline. Your permission ledger still works. Start the backend to analyze policies."));
    fill($("#findings"));
    return;
  }
  try {
    const a = await api.getAssessment(origin);
    mismatches = Object.fromEntries(a.mismatches.map((m) => [m.permission, m]));
    const r = a.risk;
    fill($("#risk"), r
      ? h("span", { class: `risk band-${r.band}` }, `${r.band[0].toUpperCase()}${r.band.slice(1)} · ${r.score} · ${r.completeness === "partial" ? "Partial" : "Full"}`)
      : h("p", { class: "offline" }, "Audit a site first."),
      r?.completeness === "partial" ? h("div", { class: "note" }, "Partial: analyze this site's policy on the website to complete.") : null);
    fill($("#findings"), a.mismatches.slice(0, 2).map((m) => h("div", { class: `mcard sev-${m.severity}` },
      h("b", {}, LABEL[m.permission]), " · ", m.explanation, h("div", { class: "note" }, m.limitation_note))),
      r ? h("div", { class: "note" }, r.disclaimer) : null);
    render();
  } catch (e) {
    fill($("#risk"), e instanceof api.SignInNeeded
      ? [h("p", { class: "offline" }, e.message),
         h("button", { class: "small", onclick: () => chrome.tabs.create({ url: WEBSITE_URL }) }, "Sign in")]
      : h("p", { class: "offline" }, `Couldn't load analysis: ${e.message}`));
  }
}

async function audit(source) {
  ledger = await readLedger();
  $("#audited").textContent = `Audited ${time(ledger[0].observed_at)}`;
  render();
  cacheLedger(origin, ledger);
  if (tab.incognito) return; // never persist incognito records
  try {
    await api.postAudit({ origin, source, page_title: tab.title || undefined,
      observations: ledger.map(({ provenance, ...o }) => ({ ...o, source })) });
  } catch { /* offline: ledger still shown */ }
  await analysis();
}

async function change(perm, target, isUndo = false) {
  const before = ledger.find((o) => o.permission === perm).browser_setting;
  const host = origin.split("://")[1];
  if (!isUndo) {
    const ok = await confirmBox(
      target === "block" ? `Block ${perm} for ${host}? The site won't be able to ask again until you reset it.`
                         : `Reset ${perm} for ${host} to Ask? The site will have to ask you again.`,
      target === "block" ? `Block ${perm}` : "Reset to Ask");
    if (!ok) return;
  }
  let error = null;
  try { await setSetting(origin, perm, target); } catch (e) { error = e.message; }
  await audit("post_action_recheck");
  const after = ledger.find((o) => o.permission === perm);
  const succeeded = !error && after.browser_setting === target;
  if (online && !tab.incognito) {
    api.postAction({ origin, permission: perm, action: isUndo ? "undo" : target === "block" ? "block" : "reset_ask",
      before_setting: before, after_setting: after.browser_setting, succeeded, error: error || undefined,
      acted_at: new Date().toISOString() }).catch(() => {});
  }
  if (!succeeded) { toast(`Couldn't change the setting: ${error || "Chrome reported no change"}. Nothing was changed.`, { error: true }); return; }
  previous = { [perm]: before };
  render();
  const row = document.getElementById(`row-${perm}`);
  row?.classList.add("flash"); setTimeout(() => row?.classList.remove("flash"), 600);
  // The open page may keep its old grant until it reloads (spike S-2).
  const stale = (target === "block" && after.page_state === "granted") || (target === "ask" && ["granted", "denied"].includes(after.page_state));
  $("#reload").hidden = !stale;
  if (!isUndo) toast(`${LABEL[perm]} ${target === "block" ? "blocked" : "reset to Ask"} and verified ✓`, { undo: () => change(perm, before === "unknown" ? "ask" : before, true) });
}

async function main() {
  if (new URLSearchParams(location.search).has("welcome")) $("#welcome").hidden = false;
  const forced = Number(new URLSearchParams(location.search).get("tabId")); // debug: popup.html?tabId=N in a tab
  [tab] = forced ? [await chrome.tabs.get(forced)] : await chrome.tabs.query({ active: true, currentWindow: true });
  try { origin = normalizeOrigin(tab?.url || ""); } catch {
    fill($("#ledger"), h("p", { class: "empty" }, "Chrome doesn't let extensions inspect this page. Try it on a regular website."));
    $("#open-full").onclick = () => chrome.tabs.create({ url: WEBSITE_URL });
    $("#report").hidden = true;
    api.checkHealth().then((ok) => ($("#dot").className = "dot" + (ok ? " on" : "")));
    return;
  }
  $("#site").textContent = origin.split("://")[1];
  const cached = await getCachedLedger(origin);
  if (cached) { ledger = cached; render(); }
  $("#open-full").onclick = () => chrome.tabs.create({ url: `${WEBSITE_URL}${WEBSITE_URL.includes("?") ? "&" : "?"}origin=${encodeURIComponent(origin)}` });
  $("#report").onclick = async () => {
    try { chrome.tabs.create({ url: await api.reportUrl(origin) }); } catch (e) { toast(e.message, { error: true }); }
  };
  $("#reload-btn").onclick = () => { chrome.tabs.reload(tab.id); $("#reload").hidden = true; };
  await audit("popup_audit");
}
main();
