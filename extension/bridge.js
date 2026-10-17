// Content script on the PrivacyLens website: relays the page's requests to the service worker.
// The page cannot call chrome.* itself; it posts { source: "privacylens-page", id, type, payload }
// and gets back { source: "privacylens-extension", id, response } on the same window.
window.addEventListener("message", (event) => {
  if (event.source !== window || event.origin !== window.location.origin) return;
  const msg = event.data;
  if (!msg || msg.source !== "privacylens-page" || typeof msg.id !== "string") return;
  chrome.runtime.sendMessage({ type: msg.type, payload: msg.payload }, (response) => {
    const error = chrome.runtime.lastError?.message;
    window.postMessage(
      { source: "privacylens-extension", id: msg.id, response: error ? { ok: false, error } : response },
      window.location.origin,
    );
  });
});

// Announce presence so the page doesn't have to wait for a ping timeout.
window.postMessage({ source: "privacylens-extension", type: "ready" }, window.location.origin);
