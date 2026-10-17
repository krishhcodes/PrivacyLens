# Deploying the demo (website + extension, no accounts)

Everyone shares one set of data. Free hosting sleeps when idle, so open the site about a minute before presenting.

## 1. Backend on Render (about 20 min)
1. Push this `consentscope/` folder to a GitHub repo.
2. On render.com: **New → Blueprint**, pick the repo. It reads `render.yaml`.
3. When it's live, open `https://<your-backend>.onrender.com/health`. It should show `{"status":"ok"}`.
4. Once the website has an address (step 2), set `CONSENTSCOPE_ALLOWED_ORIGINS` to that address in Render's Environment tab, e.g. `https://consentscope.vercel.app`. This is what lets the website talk to the backend.

No Render? `backend/Dockerfile` works on Railway, Fly.io or any Docker host (build from the `consentscope/` folder: `docker build -f backend/Dockerfile .`).

## 2. Website on Vercel (about 10 min)
1. Import the frontend repo on vercel.com (it's a Vite app, so the defaults work).
2. Add these environment variables:
   - `VITE_USE_MOCKS=false`
   - `VITE_API_BASE=https://<your-backend>.onrender.com`
3. Deploy, then put the Vercel address into the backend's `CONSENTSCOPE_ALLOWED_ORIGINS` (step 1.4).

## 3. Extension (load unpacked, no store review)
1. In `manifest.json`, add the backend to `host_permissions`: `"https://<your-backend>.onrender.com/*"`.
2. Build with the same `VITE_API_BASE`, then open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and pick the build folder.
3. To share it, zip the build folder; others load it the same way.

## Check before presenting
- `/health` answers on the backend URL.
- The website shows "backend online" and no CORS errors in the browser console (F12).
- Audit `localhost:5500` from the extension, then see it appear on the website.

## Staying local instead
Run `backend/run.sh` and the frontend's `npm run dev` on your laptop. Nothing else changes.
