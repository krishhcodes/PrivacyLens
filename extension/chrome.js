// Browser truth: reads and writes Chrome settings. Works with no backend.
export const PERMS = ["location", "camera", "microphone", "notifications"];

export function normalizeOrigin(url) {
  let parsed;
  try { parsed = new URL(url); } catch { throw new Error(`Invalid URL: ${url}`); }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error(`Non-http(s) URL: ${url}`);
  const defaultPort = parsed.protocol === "http:" ? "80" : "443";
  const port = parsed.port && parsed.port !== defaultPort ? `:${parsed.port}` : "";
  return `${parsed.protocol}//${parsed.hostname.toLowerCase()}${port}`;
}

const pattern = (origin) => `${origin}/*`;
// chrome.contentSettings uses "location" (not "geolocation") for this one.
const cs = (perm) => chrome.contentSettings[perm];
const MAP = { allow: "allow", block: "block", ask: "ask", session_only: "ask" };

export async function readSetting(origin, perm) {
  try {
    const { setting } = await cs(perm).get({ primaryUrl: `${origin}/` });
    return MAP[setting] ?? "unknown";
  } catch { return "unsupported"; }
}

export async function readAllSettings(origin) {
  const entries = await Promise.all(PERMS.map(async (p) => [p, await readSetting(origin, p)]));
  return Object.fromEntries(entries);
}

export async function setSetting(origin, perm, setting) {
  await cs(perm).set({ primaryPattern: pattern(origin), setting });
}

// Runs inside the page: no imports, no closures.
function queryAll() {
  const names = ["geolocation", "camera", "microphone", "notifications"];
  return Promise.all(names.map((n) =>
    navigator.permissions.query({ name: n }).then((s) => [n, s.state]).catch(() => [n, "unavailable"])
  )).then(Object.fromEntries);
}

export async function readPageStates(tabId) {
  const ok = { granted: "granted", denied: "denied", prompt: "prompt" };
  try {
    const [res] = await chrome.scripting.executeScript({ target: { tabId }, func: queryAll });
    const raw = res.result || {};
    return {
      location: ok[raw.geolocation] ?? "unavailable",
      camera: ok[raw.camera] ?? "unavailable",
      microphone: ok[raw.microphone] ?? "unavailable",
      notifications: ok[raw.notifications] ?? "unavailable",
    };
  } catch {
    return Object.fromEntries(PERMS.map((p) => [p, "unavailable"]));
  }
}

export async function cacheLedger(origin, observations) {
  await chrome.storage.local.set({ [`ledger:${origin}`]: { observations, cached_at: new Date().toISOString() } });
}
export async function getCachedLedger(origin) {
  const d = await chrome.storage.local.get(`ledger:${origin}`);
  return d[`ledger:${origin}`]?.observations ?? null;
}
