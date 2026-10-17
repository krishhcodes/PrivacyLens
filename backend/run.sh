#!/usr/bin/env sh
# Local: ./run.sh  -> 127.0.0.1:8000 (local only, as the architecture requires).
# Hosted: HOST=0.0.0.0 PORT=$PORT ./run.sh  (Render/Railway set PORT).
cd "$(dirname "$0")"
# Optional settings (e.g. GOOGLE_SAFE_BROWSING_API_KEY) from backend/.env; see .env.example
[ -f .env ] && set -a && . ./.env && set +a
exec python3 -m uvicorn app.main:app --host "${HOST:-127.0.0.1}" --port "${PORT:-8000}" "$@"
