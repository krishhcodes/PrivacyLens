// Edit these lines when you deploy. If you use a host other than onrender.com,
// add it to "host_permissions" in manifest.json too.
export const API_BASE = "http://127.0.0.1:8000";
export const WEBSITE_URL = "http://localhost:5180/scanner"; // where "Open full audit" goes (PrivacyLens website)

// Websites allowed to ask this extension to change a permission (bridge.js → sw.js).
// Any http://localhost:<port> and http://127.0.0.1:<port> page is allowed for development.
// When the website is hosted, add its origin here AND to content_scripts.matches in manifest.json,
// e.g. "https://privacylens.vercel.app".
export const WEBSITE_ORIGINS = [];
