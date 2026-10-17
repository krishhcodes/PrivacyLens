"""ConsentScope analysis API. Local mode by default; accounts when SUPABASE_URL is set (see auth.py)."""
import os
import re
from pathlib import Path

from urllib.parse import quote, urlencode

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from . import auth, service
from .auth import Authenticator, User
from .db import Database
from .models import (ActionRequest, AuditRequest, AuditResponse, DeleteResponse, DeviceTokenCreated, DeviceTokenList,
                     DeviceTokenRequest, Health, Me, PermissionAction, ReportLink,
                     PolicyAnalyzeRequest, PolicyAnalyzeResponse, PurposeUpdateRequest, PurposeUpdateResponse,
                     SiteAssessment, SiteDetail, SitesList)
from .origin import InvalidOrigin, normalize_origin
from .report import render_report

VERSION = "1.0.0"
DEFAULT_DB = str(Path(__file__).resolve().parent.parent / "data" / "consentscope.db")
ROOT = Path(__file__).resolve().parent.parent.parent
MOCK_FRONTEND = ROOT / "mock-frontend"
CONTRACTS = ROOT / "contracts"

# Dev default: any unpacked extension plus localhost pages (the mock frontend, the demo site).
# Set CONSENTSCOPE_EXTENSION_ID to lock CORS to exactly one extension.
DEV_ORIGIN_REGEX = r"^(chrome-extension://[a-p]{32}|http://(localhost|127\.0\.0\.1)(:\d+)?)$"


def cors_regex() -> str:
    ext = os.environ.get("CONSENTSCOPE_EXTENSION_ID")
    base = (rf"^(chrome-extension://{re.escape(ext)}|http://(localhost|127\.0\.0\.1)(:\d+)?)$" if ext
            else DEV_ORIGIN_REGEX)
    return base


def allowed_origins() -> list[str]:
    """Exact website origins allowed when hosted, e.g. https://consentscope.vercel.app (comma-separated)."""
    raw = os.environ.get("CONSENTSCOPE_ALLOWED_ORIGINS", "")
    return [o.strip().rstrip("/") for o in raw.split(",") if o.strip()]


def create_app(db_path: str | None = None) -> FastAPI:
    app = FastAPI(
        title="ConsentScope API",
        version=VERSION,
        description="Analysis service for the ConsentScope extension and website. Makes no external calls.",
    )
    # DATABASE_URL (Postgres, e.g. Supabase) wins over the local SQLite file.
    app.state.db = Database(db_path or os.environ.get("DATABASE_URL") or os.environ.get("CONSENTSCOPE_DB", DEFAULT_DB))
    app.state.auth = Authenticator(app.state.db)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins(),
        allow_origin_regex=cors_regex(),
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
    )

    def db() -> Database:
        return app.state.db

    def current_user(request: Request) -> User:
        return app.state.auth.user(request)

    def session_user(user: User = Depends(current_user)) -> User:
        """Account settings need a real sign-in, not a device token."""
        if user.via == "device":
            raise HTTPException(403, "Device tokens can't manage the account. Use the website.")
        return user

    mode = "supabase" if auth.enabled() else "local"

    def origin_or_400(raw: str) -> str:
        try:
            return normalize_origin(raw)
        except InvalidOrigin as ex:
            raise HTTPException(400, str(ex))

    @app.exception_handler(service.NotFound)
    async def not_found(_: Request, ex: service.NotFound):
        return JSONResponse(status_code=404, content={"detail": f"Site not found: {ex}"})

    @app.get("/health", response_model=Health, tags=["meta"])
    def health():
        return {"status": "ok", "version": VERSION, "auth": mode}

    @app.post("/audits", response_model=AuditResponse, tags=["ledger"])
    def post_audit(body: AuditRequest, user: User = Depends(current_user)):
        origin = origin_or_400(body.origin)
        return service.save_audit(db(), user.id, origin, body.source, body.page_title,
                                  [o.model_dump() for o in body.observations])

    @app.get("/sites", response_model=SitesList, tags=["ledger"])
    def get_sites(user: User = Depends(current_user)):
        return {"sites": service.list_sites(db(), user.id)}

    @app.delete("/sites", response_model=DeleteResponse, tags=["data"])
    def delete_sites(user: User = Depends(session_user)):
        return {"deleted": service.delete_all(db(), user.id)}

    @app.post("/actions", response_model=PermissionAction, tags=["ledger"])
    def post_action(body: ActionRequest, user: User = Depends(current_user)):
        origin = origin_or_400(body.origin)
        return service.save_action(db(), user.id, origin, body.model_dump())

    @app.post("/policy/analyze", response_model=PolicyAnalyzeResponse, tags=["policy"])
    def policy_analyze(body: PolicyAnalyzeRequest, user: User = Depends(current_user)):
        if not body.text.strip():
            raise HTTPException(400, "Paste at least one sentence of a privacy policy.")
        origin = origin_or_400(body.origin) if body.origin else None
        findings = service.analyze_policy(db(), user.id, body.text, origin)
        return {"origin": origin, "finding_count": len(findings), "findings": findings}

    # {origin:path} because the extension sends encodeURIComponent(origin) and the
    # server decodes %2F before routing. Specific suffixes are registered first.
    @app.put("/sites/{origin:path}/purpose", response_model=PurposeUpdateResponse, tags=["assessment"])
    def put_purpose(origin: str, body: PurposeUpdateRequest, user: User = Depends(current_user)):
        return service.set_purpose(db(), user.id, origin_or_400(origin), body.purpose_profile)

    @app.get("/sites/{origin:path}/assessment", response_model=SiteAssessment, tags=["assessment"])
    def get_assessment(origin: str, user: User = Depends(current_user)):
        return service.site_assessment(db(), user.id, origin_or_400(origin))

    @app.get("/sites/{origin:path}/report", response_class=HTMLResponse, tags=["report"])
    def get_report(origin: str, request: Request, u: str = "", exp: str = "", sig: str = ""):
        o = origin_or_400(origin)
        # A plain link can't send a sign-in header, so it carries a signature from /report-link.
        user = app.state.auth.report_link_user(o, u, exp, sig) if sig else current_user(request)
        if user is None:
            raise HTTPException(401, "This report link expired. Open the report again from ConsentScope.")
        return HTMLResponse(render_report(service.site_detail(db(), user.id, o)))

    @app.get("/sites/{origin:path}/report-link", response_model=ReportLink, tags=["report"])
    def get_report_link(origin: str, user: User = Depends(current_user)):
        o = origin_or_400(origin)
        service.site_detail(db(), user.id, o)  # 404 for sites this user doesn't have
        q = urlencode(app.state.auth.report_link_params(user, o))
        return {"url": f"/sites/{quote(o, safe='')}/report?{q}"}

    @app.get("/sites/{origin:path}", response_model=SiteDetail, tags=["ledger"])
    def get_site(origin: str, user: User = Depends(current_user)):
        return service.site_detail(db(), user.id, origin_or_400(origin))

    @app.delete("/sites/{origin:path}", response_model=DeleteResponse, tags=["data"])
    def delete_site(origin: str, user: User = Depends(session_user)):
        n = service.delete_site(db(), user.id, origin_or_400(origin))
        if not n:
            raise service.NotFound(origin)
        return {"deleted": n}

    # ---------- account ----------
    @app.get("/me", response_model=Me, tags=["account"])
    def get_me(user: User = Depends(current_user)):
        return {"user_id": user.id, "email": user.email, "auth": mode}

    @app.delete("/me/data", response_model=DeleteResponse, tags=["account"])
    def delete_my_data(user: User = Depends(session_user)):
        """Delete my data: every site, observation, action and policy finding, plus all device tokens."""
        n = service.delete_all(db(), user.id)
        app.state.auth.revoke_all_device_tokens(user)
        return {"deleted": n}

    @app.post("/me/tokens", response_model=DeviceTokenCreated, tags=["account"])
    def create_token(body: DeviceTokenRequest, user: User = Depends(session_user)):
        return app.state.auth.create_device_token(user, body.label)

    @app.get("/me/tokens", response_model=DeviceTokenList, tags=["account"])
    def list_tokens(user: User = Depends(session_user)):
        return {"tokens": app.state.auth.list_device_tokens(user)}

    @app.delete("/me/tokens/{token_id}", response_model=DeleteResponse, tags=["account"])
    def revoke_token(token_id: str, user: User = Depends(session_user)):
        n = app.state.auth.revoke_device_token(user, token_id)
        if not n:
            raise HTTPException(404, "No such device token.")
        return {"deleted": n}

    if MOCK_FRONTEND.is_dir():
        # Dev convenience: serve the mock frontend and the example payloads it uses in mock mode.
        app.mount("/mock", StaticFiles(directory=MOCK_FRONTEND, html=True), name="mock")
        if CONTRACTS.is_dir():
            app.mount("/contracts", StaticFiles(directory=CONTRACTS), name="contracts")

        @app.get("/", include_in_schema=False)
        def root():
            return RedirectResponse("/mock/")

    return app


app = create_app()
