// Talks to the ConsentScope extension through its content script (extension/bridge.js).
// Only the extension can change Chrome's site settings; it then records the action and a
// re-audit in the backend itself, so the website just reloads the site afterwards.
import type { ActionType, BrowserSetting, PermissionType } from './types';

type BridgeResponse = { ok: boolean; error?: string; before?: BrowserSetting; after?: BrowserSetting; backendError?: string; version?: string };

const TIMEOUT_MS = 8000;
let ready = false;

window.addEventListener('message', event => {
  if (event.source === window && event.data?.source === 'privacylens-extension' && event.data.type === 'ready') ready = true;
});

function request(type: string, payload?: unknown, timeoutMs = TIMEOUT_MS): Promise<BridgeResponse> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      window.removeEventListener('message', onMessage);
      reject(new ExtensionUnavailable());
    }, timeoutMs);
    function onMessage(event: MessageEvent) {
      const d = event.data;
      if (event.source !== window || d?.source !== 'privacylens-extension' || d.id !== id) return;
      clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      resolve(d.response ?? { ok: false, error: 'Empty response from the extension' });
    }
    window.addEventListener('message', onMessage);
    window.postMessage({ source: 'privacylens-page', id, type, payload }, window.location.origin);
  });
}

export class ExtensionUnavailable extends Error {
  constructor() {
    super('Install or enable the ConsentScope extension (see the Extension tab) to change permissions, then reload this page.');
    this.name = 'ExtensionUnavailable';
  }
}

/** True when the extension's bridge answers. */
export async function isExtensionAvailable(): Promise<boolean> {
  try {
    ready = (await request('ping', undefined, ready ? 2000 : 800)).ok;
    return ready;
  } catch {
    return false;
  }
}

/** Ask the extension to set a real Chrome site setting. Resolves with the re-read value. */
export async function setPermissionViaExtension(
  origin: string, permission: PermissionType, setting: BrowserSetting, action?: ActionType
): Promise<BridgeResponse> {
  // Fail fast (instead of after the full timeout) when the extension isn't there.
  if (!ready && !(await isExtensionAvailable())) throw new ExtensionUnavailable();
  const r = await request('setPermission', { origin, permission, setting, action });
  if (!r.ok) throw new Error(r.error || 'The extension could not change this permission.');
  return r;
}

// ---------- account link ----------
// When accounts are on, the extension sends data with its own device token, which the website
// creates after you sign in and hands over through the bridge. The extension never sees a password.
export type ExtensionLink = { linked: boolean; userId?: string; tokenId?: string; email?: string | null };

export async function getExtensionLink(): Promise<ExtensionLink | null> {
  if (!(await isExtensionAvailable())) return null;
  const r = await request('getLink') as BridgeResponse & ExtensionLink;
  return r.ok ? { linked: Boolean(r.linked), userId: r.userId, tokenId: r.tokenId, email: r.email } : null;
}

export async function setExtensionLink(link: { token: string; tokenId: string; userId: string; email: string | null }): Promise<void> {
  const r = await request('setLink', link);
  if (!r.ok) throw new Error(r.error || 'The extension could not save the sign-in.');
}

export async function clearExtensionLink(): Promise<void> {
  if (await isExtensionAvailable()) await request('clearLink');
}
