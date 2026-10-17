# ConsentScope: backend + PrivacyLens frontend

```
frontend/       PrivacyLens website (React + Vite): the main UI, reads everything from the backend
backend/        FastAPI + SQLite analysis service (rules, scoring, persistence, HTML report) and its tests
contracts/      API contract: API_CONTRACT.md, openapi.json, types.ts, api.ts, examples/*.json (also the mock data)
mock-frontend/  The backend's no-build test UI (served at /mock/); kept for API testing
extension/      The real Chrome extension (load unpacked; see extension/README.md)
demo-site/      PocketCalc test page: python3 -m http.server 5500
scanner/        Local scanner: reads every site's saved permissions from Chrome/Edge/Brave (scanner/README.md)
docs/           The original plans and frontend handoff
```

## Run
```sh
cd backend
python3 -m pip install -r requirements.txt
./run.sh                      # API on http://127.0.0.1:8000, Swagger at /docs
python3 -m pytest -q          # 63 tests
```
Windows: `backend\run.bat`.

Then the website (needs Node 20+):
```sh
cd frontend
npm ci
npm run dev                   # http://localhost:5180 (fixed port; the extension links here)
```
It calls the backend at `VITE_API_BASE` (default `http://127.0.0.1:8000`; see `frontend/.env.example`). If the backend is unreachable, it shows a "backend offline" banner and labelled demo data. To fill it with your own data, run `python scanner/scan.py` or audit sites with the extension. Integration status: [INTEGRATION_PLAN.md](INTEGRATION_PLAN.md).

Open **http://127.0.0.1:8000/** for the mock frontend (served at `/mock/`). It simulates Chrome's settings, so you can audit, block, undo, analyze the sample policy, change the purpose and export the report without the extension. Tick **Mock data** to drive it from `contracts/examples` with the backend off.

Hosting: see [DEPLOY.md](DEPLOY.md).

Data lives in `backend/data/consentscope.db` (override with `CONSENTSCOPE_DB`).

## Plugging in the real extension
1. Copy `contracts/types.ts` to `extension/src/types.ts` and `contracts/api.ts` to `extension/src/lib/api.ts` (fix the `import.meta.glob` path to `contracts/examples`).
2. `.env`: `VITE_USE_MOCKS=true` until the backend is running, then `false`.
3. In the popup, send `page_title: tab.title` with `postAudit`, and after Block/Reset/Undo re-audit with `source: "post_action_recheck"`.
4. CORS accepts any `chrome-extension://<id>` and localhost pages in dev. Set `CONSENTSCOPE_EXTENSION_ID=<id>` to lock it to your extension.

The mock frontend's `mock-frontend/api.js` has the same function names, so its screens show exactly what each call returns.
