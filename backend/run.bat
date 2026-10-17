@echo off
REM Windows: start the ConsentScope API on http://127.0.0.1:8000
cd /d "%~dp0"
REM Optional settings (e.g. GOOGLE_SAFE_BROWSING_API_KEY) from backend\.env; see .env.example
if exist .env for /f "usebackq eol=# tokens=1,* delims==" %%a in (".env") do set "%%a=%%b"
python -m pip install -q fastapi uvicorn pydantic
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
