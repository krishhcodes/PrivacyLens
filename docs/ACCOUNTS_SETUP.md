# Turning on accounts (Supabase)

Accounts are off until the backend has `SUPABASE_URL`. Without it, everything runs as before (local mode, one user, SQLite).

## 1. Supabase (you)
1. **Authentication → Sign In / Providers**
   - **Email**: on (it's on by default). This gives the "Email me a sign-in link" button.
   - **Google**: turn on. It asks for a Client ID and Secret from Google Cloud:
     Google Cloud Console → APIs & Services → Credentials → Create credentials → OAuth client ID → Web application.
     Under *Authorized redirect URIs* paste the callback URL Supabase shows on the Google provider page
     (`https://cdpfxiquqeyhcxewegmu.supabase.co/auth/v1/callback`). Copy the Client ID and Secret back into Supabase.
2. **Authentication → URL Configuration**
   - *Site URL*: your Vercel address, e.g. `https://privacy-lens-git-main-krishh2.vercel.app`
   - *Redirect URLs*: add the same address, plus `http://localhost:5180` for local testing.
3. **Connect** (top of the project page) → **Session pooler** → copy the connection string and put your database password in it.
   It looks like `postgresql://postgres.cdpfxiquqeyhcxewegmu:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres`.
   This is a secret: paste it only into Render.

## 2. Render (you)
consentscope-api → **Environment**:
- `DATABASE_URL` = the Session pooler string from step 1.3
- `SUPABASE_URL` = `https://cdpfxiquqeyhcxewegmu.supabase.co` (the blueprint sets this)
- `CONSENTSCOPE_ALLOWED_ORIGINS` = your Vercel address

Save; Render redeploys. `https://consentscope-api.onrender.com/health` should then say `"auth":"supabase"`.
The backend creates its tables in Supabase on first start.

## 3. Vercel
Nothing to set: `frontend/.env.production` already has the Supabase URL and publishable key (both are public by design).

## 4. Extension and scanner
- Reload the extension (v0.5.0). Open the website and sign in: the website links the extension to your account by itself.
  Settings → Account shows "Linked to this account".
- Scanner: Settings → Account → **Create scanner token**, then run the command it shows.

## Signing out
The top-bar button signs you out on the website and in the extension, and revokes the extension's token.
