// Content script on every page: tells the service worker when this site's permission state changes
// (e.g. you click "Allow" on a location prompt). The service worker decides whether to record it;
// sites where nothing is allowed or blocked are never sent anywhere.
(() => {
  if (location.protocol !== "http:" && location.protocol !== "https:") return;
  const NAMES = { geolocation: "location", camera: "camera", microphone: "microphone", notifications: "notifications" };
  const states = {};
  let timer;

  const report = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        chrome.runtime.sendMessage({ type: "pageStates", payload: { title: document.title, states } }, () => void chrome.runtime.lastError);
      } catch { /* extension reloaded: this old content script is orphaned */ }
    }, 400);
  };

  Promise.all(Object.entries(NAMES).map(async ([name, perm]) => {
    try {
      const status = await navigator.permissions.query({ name });
      states[perm] = status.state;
      status.onchange = () => { states[perm] = status.state; report(); };
    } catch { states[perm] = "unavailable"; }
  })).then(report);
})();
