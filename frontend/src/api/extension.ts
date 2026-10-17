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
    super('Install or enable the ConsentScope extension (extension/ folder, Load unpacked) to change permissions, then reload this page.');
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
