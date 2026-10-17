# Plan: deploy ConsentScope with accounts and a hosted database

Status: built 2026-10-17 (accounts, per-user Postgres, extension + scanner linking). Setup steps: [ACCOUNTS_SETUP.md](ACCOUNTS_SETUP.md).

## The short version

| Piece | Today | After |
|---|---|---|
| Backend (FastAPI) | Your laptop, SQLite file | **Render** web service, talks to a hosted database |
| Database | `consentscope.db` on the laptop | **Supabase Postgres**, every row tagged with its owner |
| Sign-in | None, everyone shares data | **Supabase Auth** (Google + email link) |
| Website (PrivacyLens) | `npm run dev` on the laptop | **Vercel** |
| Extension | Loaded unpacked, talks to 127.0.0.1 | Still unpacked (or Web Store later), talks to Render, signs in through the website |
| Scanner (`scan.py`) | Posts to 127.0.0.1 | Same script, plus a personal token so the data lands in your account |

**Recommended stack: Render + Vercel + Supabase.** Render and Vercel are already prepared (`render.yaml`, `DEPLOY.md`). Supabase gives you both the database and the sign-in system in one free account, so there is one less service to learn and no password storage to write yourself. The backend keeps its job (all the analysis and scoring); Supabase only stores rows and checks who you are.

Why not the alternatives, in one line each: Firebase uses a non-SQL database, so the existing SQL code would need a rewrite. Clerk/Auth0 are good sign-in tools but would still need a separate database. Writing our own login (passwords, reset emails) is slow and easy to get wrong.

---

## 1. Hosting

1. **GitHub repo.** Push the laptop's `Downloads\consentscope` folder (it is newer than the copy here). Everything below deploys from that repo.
2. **Backend on Render.** Use the existing `render.yaml`, with three changes: install from `requirements.txt` (it currently lists packages by hand), add the database and Supabase settings as secret environment variables, and drop the "disk is wiped" warning since data now lives in Supabase.
   - Free plan sleeps after ~15 minutes idle and takes ~1 minute to wake. Fine for a demo; the $7/month plan stays awake.
3. **Website on Vercel.** Root directory `frontend`, env vars `VITE_API_BASE`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. The anon key is meant to be public, so it is safe in the website.
4. **Extension.** Point `config.js` at the Render and Vercel addresses and add both to `manifest.json`. Keep loading it unpacked for now. The Chrome Web Store needs a $5 developer account, a privacy policy page, and a review that can take days, and the `contentSettings` permission will get extra scrutiny.
5. **Scanner.** Stays a local script (it has to read files on your computer). It gains a `--token` option.

## 2. Accounts and sign-in

**On the website:** a Sign in page using Supabase's ready-made login (Google button + "email me a link"). No passwords to store. After sign-in the website holds a short-lived token (a JWT, basically a signed note saying "this is user X") and sends it with every request as `Authorization: Bearer <token>`.

**On the backend:** one small check that runs before every endpoint except `/health`. It verifies the token's signature using Supabase's JWT secret, reads the user id from it, and passes that id down to every database query. Requests with no token or a bad one get `401`.

**Linking the extension to a user** (the tricky part, because the extension can't show the Supabase login itself easily):
1. The popup shows "Sign in" when it has no token. Clicking it opens the website's sign-in page.
2. After you sign in, the website hands the token to the extension through the bridge it already uses for the Block buttons.
3. The extension saves it in `chrome.storage.local` and sends it on its requests. When it expires, the extension asks the website for a fresh one (or shows "Sign in" again).

This keeps one login for both, and the extension never sees a password.

**Linking the scanner:** the website gets a small "Device token" panel that creates a long-lived personal token you paste once: `python scan.py --api https://<backend> --token <token>`. The backend stores only a hash of it, and you can revoke it.

## 3. From SQLite to a hosted database with per-user data

- **Every table gets a `user_id` column.** `websites` is keyed by `(user_id, origin)` instead of just `origin`, so two people auditing the same site each get their own copy. All other tables already point at `websites` by origin, so they gain `user_id` too.
- **Every query filters by `user_id`.** This all lives in `db.py` and `service.py`, so the change is contained. Tests get a "two users don't see each other's data" check.
- **Driver:** swap Python's built-in `sqlite3` for `psycopg` (Postgres). The SQL is almost the same; `?` placeholders become `%s`, and the start-up `seq` counter becomes a database sequence so two backend copies can't clash.
- **Keep SQLite for local mode and tests.** If `DATABASE_URL` is not set, the backend runs exactly as today, with a single built-in "local" user and no sign-in. Your laptop demo keeps working unchanged.
- **Moving existing data:** optional. A one-off script can copy your laptop's `consentscope.db` into your account. Or just re-run the scanner and audits after sign-in, which is simpler.
- The backend is the only thing that talks to the database (with a secret connection string). The website never reads Supabase tables directly, so the API contract stays the single source of truth.

## 4. What changes in the privacy promise

Today the onboarding says **"nothing leaves your computer."** Once data is stored online, that sentence is no longer true and must change. Suggested approach:

- **Keep a local mode** (no account, laptop backend) and say so plainly.
- For the hosted version, say what is stored: the sites you audited, which permissions they had and when, Block/Allow actions you took, policy findings (short excerpts of the policy text), and your email. Say what is not: no browsing history, no page contents, no passwords.
- The scanner uploads your browser's site permission list. That is the most sensitive part and should be called out by name.
- Add a short privacy policy page on the website (also required for the Web Store).
- With real accounts, people normally expect to delete their data. You chose "no delete option" for the demo; that is a decision to revisit before real users (see below).

## 5. Rough effort

| Step | Who | Effort |
|---|---|---|
| GitHub repo, Render, Vercel, Supabase accounts | You | 30–45 min |
| Deploy as-is (no auth) to confirm hosting works | Claude + you | 30 min |
| Backend: Postgres support + `user_id` everywhere + tests | Claude | 2–3 h |
| Backend: token check, device tokens | Claude | 1–2 h |
| Website: sign-in page, send token, sign out, device token panel | Claude | 2–3 h |
| Extension: sign-in handoff via bridge, token on requests | Claude | 1–2 h |
| Scanner: `--token` option | Claude | 15 min |
| Privacy text + policy page | Claude, you review | 30 min |
| End-to-end test with two accounts | Claude + you | 1 h |

About **one working day** in total. Doing it in this order means something is live early and each step can be checked before the next.

## 6. What only you can do

1. Create a **GitHub** repo and push the laptop folder (or let me connect to it once it exists).
2. Create a **Supabase** project (free). Copy: Project URL, anon key, JWT secret, and the database connection string. The last two are secrets: paste them only into Render's Environment tab, never into the website or a chat.
3. In Supabase → Authentication, turn on **Google** sign-in (needs a Google Cloud OAuth client, about 10 minutes) and/or **email links**. Add your Vercel address to the allowed redirect URLs.
4. Create **Render** and **Vercel** accounts and connect them to the GitHub repo.
5. Decide the open questions below.
6. Optional, later: $5 Chrome Web Store developer account.

## 7. Decisions for you

1. **Keep local mode (no account)?** Recommended: yes. Your laptop demo keeps working and the privacy story stays honest.
2. **Sign-in methods?** Recommended: Google + email link.
3. **Delete my data / delete account?** Recommended: add it for the hosted version, even though the demo hides it.
4. **Copy your laptop data into your account, or start fresh?** Recommended: start fresh.

Free-tier notes: Render free sleeps when idle; Supabase free pauses a project after about a week with no activity (one click to resume) and allows 500 MB, far more than this needs.
