import * as api from "./api.js";

const PERMS = ["location", "camera", "microphone", "notifications"];
const ICON = { location: "📍", camera: "📷", microphone: "🎙", notifications: "🔔" };
const LABEL = new Proxy({ location: "Location", camera: "Camera", microphone: "Microphone", notifications: "Notifications",
  popups: "Pop-ups", clipboard: "Clipboard", sensors: "Motion sensors", automatic_downloads: "Automatic downloads",
  midi_sysex: "MIDI devices", usb: "USB devices", serial: "Serial ports", hid: "HID devices", bluetooth: "Bluetooth",
  file_system_write: "File editing", window_management: "Window management", idle_detection: "Idle detection",
  local_fonts: "Local fonts", ar: "Augmented reality", vr: "Virtual reality", protected_media: "Protected content IDs",
  background_sync: "Background sync", payment_handler: "Payment handlers", storage_access: "Third-party storage access" },
  { get: (t, k) => t[k] ?? String(k).replace(/_/g, " ") });
const SETTINGS = ["allow", "block", "ask"];
const STATES = ["granted", "denied", "prompt", "unavailable", "not_checked"];
const PROFILES = ["calculator", "video_meeting", "maps", "weather", "general"];
const STATE_FOR = { allow: "granted", block: "denied", ask: "prompt" };

const $ = (s) => document.querySelector(s);

// Tiny DOM builder. Text always goes through text nodes, never innerHTML.
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "class") el.className = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}
// replaceChildren() stringifies arrays and null, so flatten and drop empties first.
function fill(el, ...children) {
  el.replaceChildren(...children.flat(Infinity).filter((c) => c != null && c !== false));
}
const badge = (p) => h("span", { class: `badge b-${p}` }, p === "policy_declared" ? "policy" : p);
const settingChip = (s) => h("span", { class: `chip s-${s}` }, s === "allow" ? "ALLOWED" : s === "block" ? "BLOCKED" : s.toUpperCase());
const time = (iso) => (iso ? new Date(iso).toLocaleTimeString() : "—");

function showRaw(data) { $("#raw").textContent = JSON.stringify(data, null, 2); return data; }

let toastTimer;
function toast(msg, { error = false, undo = null, ms = 4000 } = {}) {
  const t = $("#toast");
  clearTimeout(toastTimer);
  t.replaceChildren(h("span", {}, msg));
  t.className = "toast" + (error ? " error" : "");
  if (undo) {
    let left = 10;
    const btn = h("button", { class: "small", onclick: () => { t.hidden = true; clearInterval(iv); undo(); } }, `Undo (${left}s)`);
    const iv = setInterval(() => { left -= 1; btn.textContent = `Undo (${left}s)`; if (left <= 0) { clearInterval(iv); t.hidden = true; } }, 1000);
    t.append(btn);
  } else {
    toastTimer = setTimeout(() => (t.hidden = true), ms);
  }
  t.hidden = false;
}

function confirmDialog(text, okLabel) {
  return new Promise((resolve) => {
    const d = $("#confirm");
    $("#confirm-text").textContent = text;
    $("#confirm-ok").textContent = okLabel;
    d.addEventListener("close", () => resolve(d.returnValue === "ok"), { once: true });
    d.showModal();
  });
}

function errorText(e) { return e?.message || String(e); }

// ---------------- connection ----------------
let online = false;
async function refreshHealth() {
  online = await api.checkHealth();
  $("#status-dot").className = "dot " + (api.config.useMocks ? "mock" : online ? "on" : "");
  $("#status-text").textContent = api.config.useMocks ? "mock data (contracts/examples)" : online ? "backend online" : "backend offline";
  return online;
}
$("#base-url").value = api.config.base;
$("#base-url").addEventListener("change", (e) => { api.config.base = e.target.value.replace(/\/$/, ""); refreshAll(); });
$("#use-mocks").checked = api.config.useMocks;
$("#use-mocks").addEventListener("change", (e) => { api.config.useMocks = e.target.checked; refreshAll(); });

// ---------------- simulated browser (stands in for contentSettings + Permissions API) ----------------
const browser = new Map(); // origin -> { perm: { setting, state } }
function simFor(origin) {
  if (!browser.has(origin)) {
    browser.set(origin, Object.fromEntries(PERMS.map((p) => [p, { setting: p === "location" ? "allow" : p === "notifications" ? "block" : "ask", state: "" }])));
    for (const p of PERMS) browser.get(origin)[p].state = STATE_FOR[browser.get(origin)[p].setting];
  }
  return browser.get(origin);
}
function readLedger(origin) {
  const sim = simFor(origin);
  const at = new Date().toISOString();
  return PERMS.map((p) => ({ permission: p, browser_setting: sim[p].setting, page_state: sim[p].state, observed_at: at, provenance: "simulated" }));
}

let current = { origin: null, observations: [], previous: {} };

function currentOrigin() {
  try { return api.normalizeOrigin($("#tab-url").value.trim()); } catch (e) { return { error: errorText(e) }; }
}

function renderLedger() {
  const o = currentOrigin();
  const box = $("#ledger");
  if (typeof o !== "string") {
    box.replaceChildren(h("p", { class: "empty" }, "Chrome doesn't let extensions inspect this page. Try it on a regular website.", h("br"), h("span", { class: "mono" }, o.error)));
    return;
  }
  const sim = simFor(o);
  box.replaceChildren(...PERMS.map((p) => {
    const obs = current.origin === o ? current.observations.find((x) => x.permission === p) : null;
    const prev = current.previous[p];
    return h("div", { class: "lrow", id: `row-${p}` },
      h("div", { class: "head" },
        h("span", { class: "perm" }, `${ICON[p]} ${LABEL[p]}`),
        h("span", {},
          prev ? h("s", { class: "muted" }, prev.toUpperCase(), " ") : null,
          obs ? settingChip(obs.browser_setting) : h("span", { class: "muted" }, "not audited"), " ",
          obs ? h("span", { class: "muted" }, obs.page_state) : null, " ",
          obs ? h("span", { class: "mono muted" }, time(obs.observed_at)) : null, " ",
          obs ? badge(obs.provenance) : null)),
      h("div", { class: "controls" },
        h("label", { class: "muted mono", title: "Simulated Chrome setting" }, "chrome ",
          h("select", { onchange: (e) => { sim[p].setting = e.target.value; sim[p].state = STATE_FOR[e.target.value]; renderLedger(); } },
            SETTINGS.map((s) => h("option", { value: s, selected: sim[p].setting === s }, s)))),
        h("label", { class: "muted mono", title: "Simulated page state" }, "page ",
          h("select", { onchange: (e) => { sim[p].state = e.target.value; } },
            STATES.map((s) => h("option", { value: s, selected: sim[p].state === s }, s)))),
        obs ? h("button", { class: "small", onclick: () => changeSetting(p, "block") }, "Block") : null,
        obs ? h("button", { class: "small", onclick: () => changeSetting(p, "ask") }, "Reset to Ask") : null));
  }));
}
$("#tab-url").addEventListener("input", renderLedger);

async function audit(source = "simulated") {
  const origin = currentOrigin();
  if (typeof origin !== "string") return renderLedger();
  current = { origin, observations: readLedger(origin), previous: current.origin === origin ? current.previous : {} };
  $("#audited-at").textContent = `Audited ${time(current.observations[0].observed_at)}`;
  renderLedger();
  try {
    showRaw(await api.postAudit({
      origin, source: "simulated", page_title: $("#tab-title").value || undefined,
      observations: current.observations.map((o) => ({ ...o, source })),
    }));
  } catch (e) { toast(`Couldn't save the audit: ${errorText(e)}`, { error: true }); }
  await renderPopupAnalysis(origin);
  refreshSites();
}
$("#audit-btn").addEventListener("click", () => audit("simulated"));

async function changeSetting(permission, target, { isUndo = false } = {}) {
  const origin = current.origin;
  const sim = simFor(origin);
  const before = sim[permission].setting;
  const host = origin.split("://")[1];
  if (!isUndo) {
    const text = target === "block"
      ? `Block ${permission} for ${host}? The site won't be able to ask again until you reset it.`
      : `Reset ${permission} for ${host} to Ask? The site will need to ask you again.`;
    if (!(await confirmDialog(text, target === "block" ? `Block ${permission}` : "Reset to Ask"))) return;
  }
  sim[permission].setting = target;
  sim[permission].state = STATE_FOR[target];
  // Recheck: after_setting is what we read back, not what we asked for.
  const after = readLedger(origin).find((o) => o.permission === permission).browser_setting;
  current.previous = { [permission]: before };
  const action = isUndo ? "undo" : target === "block" ? "block" : "reset_ask";
  try {
    showRaw(await api.postAction({ origin, permission, action, before_setting: before, after_setting: after, succeeded: after === target, acted_at: new Date().toISOString() }));
  } catch (e) { toast(`Setting changed, but the action log failed: ${errorText(e)}`, { error: true }); }
  await audit("post_action_recheck");
  const row = document.getElementById(`row-${permission}`);
  row?.classList.add("flash"); setTimeout(() => row?.classList.remove("flash"), 600);
  if (!isUndo) {
    toast(`${LABEL[permission]} ${target === "block" ? "blocked" : "reset to Ask"} and verified ✓`, {
      undo: () => changeSetting(permission, before, { isUndo: true }),
    });
  }
}

async function renderPopupAnalysis(origin) {
  const chip = $("#risk-chip"), list = $("#popup-mismatches");
  if (!api.config.useMocks && !(await refreshHealth())) {
    chip.replaceChildren(h("p", { class: "offline" }, "Analysis service is offline. Your permission ledger still works. Start the backend to analyze policies."));
    list.replaceChildren();
    return;
  }
  try {
    const a = await api.getAssessment(origin);
    chip.replaceChildren(riskChip(a.risk));
    list.replaceChildren(...a.mismatches.slice(0, 2).map(mismatchCard),
      h("div", { class: "row" },
        h("button", { onclick: () => openDetail(origin) }, "Open full audit"),
        h("button", { onclick: () => { $("#policy-origin").value = origin; switchTab("policy"); } }, "Analyze this site's policy")));
  } catch (e) {
    chip.replaceChildren(h("p", { class: "offline" }, errorText(e)));
  }
}

function riskChip(risk) {
  if (!risk) return h("p", { class: "offline" }, "Audit a site first.");
  return h("span", { class: `risk band-${risk.band}` },
    `${risk.band[0].toUpperCase()}${risk.band.slice(1)} · ${risk.score} · ${risk.completeness === "partial" ? "Partial" : "Full"}`);
}

function mismatchCard(m) {
  return h("div", { class: `mcard sev-${m.severity}` },
    h("div", {}, h("b", {}, m.severity === "high" ? "High — review" : m.severity === "review" ? "Review" : "Info"), " · ",
      LABEL[m.permission], " ", h("span", { class: "mono muted" }, m.rule_id), " ", badge(m.provenance)),
    h("div", {}, m.explanation),
    h("div", { class: "note" }, m.limitation_note));
}

function findingCard(f) {
  return h("div", { class: `fcard prov-${f.provenance}` },
    h("div", {}, h("b", {}, f.category), " ", h("span", { class: "mono muted" }, f.rule_id), " ", badge(f.provenance),
      f.evidence_type === "keyword_match_review" ? h("span", { class: "muted" }, " · needs review") : null),
    f.excerpt ? h("blockquote", {}, f.excerpt) : null,
    h("div", {}, f.explanation),
    h("div", { class: "note" }, f.recommendation));
}

// ---------------- dashboard ----------------
function switchTab(name) {
  document.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
  document.querySelectorAll(".tab").forEach((t) => (t.hidden = t.id !== `tab-${name}`));
}
document.querySelectorAll(".tabs button").forEach((b) => b.addEventListener("click", () => switchTab(b.dataset.tab)));

async function refreshSites() {
  const box = $("#tab-sites");
  try {
    const { sites } = await api.getSites();
    if (!sites.length) { box.replaceChildren(h("p", { class: "empty" }, "No sites audited yet. Open any site and click the ConsentScope icon.")); return; }
    box.replaceChildren(h("div", { class: "tbl-wrap" }, h("table", {},
      h("tr", {}, ["Origin", "Purpose", "Allowed", "Band", "Last audit"].map((x) => h("th", {}, x))),
      sites.map((s) => h("tr", { class: "clickable", onclick: () => openDetail(s.origin) },
        h("td", {}, s.display_name),
        h("td", {}, s.purpose_profile, " ", h("span", { class: "muted" }, `(${s.purpose_source})`)),
        h("td", {}, s.latest_observations.filter((o) => o.browser_setting === "allow" || o.page_state === "granted").map((o) => LABEL[o.permission]).join(", ") || "—"),
        h("td", {}, s.band ? h("span", { class: `risk band-${s.band}` }, `${s.band} · ${s.score}`) : "—"),
        h("td", { class: "mono" }, time(s.last_audited_at)))))));
  } catch (e) {
    box.replaceChildren(h("p", { class: "offline" }, `Analysis service is offline. ${errorText(e)}`));
  }
}

async function openDetail(origin) {
  switchTab("detail");
  const box = $("#tab-detail");
  box.replaceChildren(h("p", { class: "muted" }, "Loading…"));
  try {
    const d = showRaw(await api.getSite(origin));
    const a = d.assessment;
    const risk = a?.risk;
    fill(box,
      h("h2", {}, d.display_name),
      d.observations.some((o) => o.provenance === "simulated") ? h("div", { class: "sim-banner" }, "Demo data: not a real browser observation") : null,
      h("div", { class: "row" },
        h("label", { class: "muted" }, "Purpose ",
          h("select", { onchange: async (e) => { try { await api.updatePurpose(d.origin, e.target.value); toast("Purpose updated"); } catch (err) { toast(errorText(err), { error: true }); } openDetail(d.origin); } },
            PROFILES.map((p) => h("option", { value: p, selected: p === d.purpose_profile }, p)))),
        h("span", { class: "muted" }, d.purpose_source === "user" ? "Set by you" : `Inferred (${d.purpose_confidence})`),
        h("a", { href: api.reportUrl(d.origin), target: "_blank", rel: "noopener" }, h("button", {}, "Export report ↗")),
        h("button", { class: "danger", onclick: async () => {
          if (!(await confirmDialog(`Delete all stored data for ${d.display_name}?`, "Delete"))) return;
          try { showRaw(await api.deleteSite(d.origin)); toast("Site deleted"); box.replaceChildren(); refreshSites(); switchTab("sites"); }
          catch (err) { toast(errorText(err), { error: true }); }
        } }, "Delete site")),
      h("h3", {}, "Ledger (latest)"),
      h("div", { class: "tbl-wrap" }, h("table", {},
        h("tr", {}, ["Permission", "Chrome", "Page", "Observed", ""].map((x) => h("th", {}, x))),
        d.latest_observations.map((o) => h("tr", {}, h("td", {}, LABEL[o.permission]), h("td", {}, settingChip(o.browser_setting)),
          h("td", {}, o.page_state), h("td", { class: "mono" }, time(o.observed_at)), h("td", {}, badge(o.provenance)))))),
      h("h3", {}, "Actions"),
      d.actions.length ? h("div", { class: "tbl-wrap" }, h("table", {},
        h("tr", {}, ["When", "Permission", "Action", "Before → after"].map((x) => h("th", {}, x))),
        d.actions.slice().reverse().map((x) => h("tr", {}, h("td", { class: "mono" }, time(x.acted_at)), h("td", {}, LABEL[x.permission]), h("td", {}, x.action),
          h("td", {}, h("s", { class: "muted" }, x.before_setting.toUpperCase()), " → ", settingChip(x.after_setting), x.succeeded ? "" : ` failed: ${x.error || ""}`)))))
        : h("p", { class: "empty" }, "No actions yet."),
      h("h3", {}, "Purpose mismatches"),
      a?.mismatches?.length ? a.mismatches.map(mismatchCard) : h("p", { class: "empty" }, "None."),
      h("h3", {}, "Policy findings"),
      d.policy_findings.length ? d.policy_findings.map(findingCard) : h("p", { class: "empty" }, "No policy analyzed for this site."),
      h("h3", {}, "Score breakdown"),
      risk ? [
        riskChip(risk),
        h("div", { class: "tbl-wrap" }, h("table", {},
          h("tr", {}, ["Factor", "Points", "Provenance", "Why"].map((x) => h("th", {}, x))),
          risk.factors.map((f) => h("tr", {}, h("td", {}, f.label), h("td", { class: "num" }, f.points), h("td", {}, badge(f.provenance)), h("td", {}, f.explanation))))),
        h("h3", {}, "What we don't know"),
        risk.missing.length ? h("ul", {}, risk.missing.map((m) => h("li", {}, m))) : h("p", { class: "muted" }, "Nothing missing."),
        h("p", { class: "note" }, risk.disclaimer),
      ] : h("p", { class: "empty" }, "Audit a site first."));
  } catch (e) {
    box.replaceChildren(h("p", { class: "offline" }, errorText(e)));
  }
}

// ---------------- policy analyzer ----------------
$("#sample-btn").addEventListener("click", async () => { $("#policy-text").value = await api.loadSamplePolicy(); });
$("#analyze-btn").addEventListener("click", async () => {
  const text = $("#policy-text").value;
  const out = $("#policy-out");
  if (!text.trim()) { out.replaceChildren(h("p", { class: "empty" }, "Paste at least one sentence of a privacy policy.")); return; }
  let origin = $("#policy-origin").value.trim() || undefined;
  try { if (origin) origin = api.normalizeOrigin(origin); } catch (e) { out.replaceChildren(h("p", { class: "offline" }, errorText(e))); return; }
  try {
    const r = showRaw(await api.analyzePolicy(text, origin));
    const spans = r.findings.filter((f) => f.char_end > f.char_start).sort((a, b) => a.char_start - b.char_start);
    const parts = []; let pos = 0;
    for (const f of spans) {
      if (f.char_start < pos) continue; // overlapping: first one wins
      parts.push(text.slice(pos, f.char_start), h("mark", { class: `cat-${f.category}`, title: `${f.rule_id} · ${f.category}` }, text.slice(f.char_start, f.char_end)));
      pos = f.char_end;
    }
    parts.push(text.slice(pos));
    fill(out,
      api.config.useMocks ? h("p", { class: "note" }, "Mock mode: findings come from the example file, so highlights may not line up with your text.") : null,
      h("h3", {}, `${r.finding_count} finding${r.finding_count === 1 ? "" : "s"}`),
      h("div", { class: "highlighted" }, parts),
      r.findings.length ? r.findings.map(findingCard) : h("p", { class: "empty" }, "No red-flag patterns matched. This doesn't mean the policy is safe — rules can miss things."));
    refreshSites();
    if (origin && origin === current.origin) renderPopupAnalysis(origin);
  } catch (e) {
    out.replaceChildren(h("p", { class: "offline" }, errorText(e)));
  }
});

// ---------------- settings ----------------
$("#clear-all").addEventListener("click", async () => {
  if (!(await confirmDialog("Delete every site, observation, action and finding?", "Clear all"))) return;
  try { showRaw(await api.deleteAllSites()); browser.clear(); current = { origin: null, observations: [], previous: {} }; toast("All data cleared"); refreshAll(); }
  catch (e) { toast(errorText(e), { error: true }); }
});

async function refreshAll() {
  await refreshHealth();
  renderLedger();
  refreshSites();
  if (current.origin) renderPopupAnalysis(current.origin);
}
refreshAll();
setInterval(refreshHealth, 10000);
