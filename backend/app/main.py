"""ConsentScope local analysis API."""
import os
import re
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from . import service
from .db import Database
from .models import (ActionRequest, AuditRequest, AuditResponse, DeleteResponse, Health, PermissionAction,
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
    app.state.db = Database(db_path or os.environ.get("CONSENTSCOPE_DB", DEFAULT_DB))
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins(),
        allow_origin_regex=cors_regex(),
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type"],
    )

    def db() -> Database:
        return app.state.db

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
        return {"status": "ok", "version": VERSION}

    @app.post("/audits", response_model=AuditResponse, tags=["ledger"])
    def post_audit(body: AuditRequest):
        origin = origin_or_400(body.origin)
        return service.save_audit(db(), origin, body.source, body.page_title,
                                  [o.model_dump() for o in body.observations])

    @app.get("/sites", response_model=SitesList, tags=["ledger"])
    def get_sites():
        return {"sites": service.list_sites(db())}

    @app.delete("/sites", response_model=DeleteResponse, tags=["data"])
    def delete_sites():
        return {"deleted": service.delete_all(db())}

    @app.post("/actions", response_model=PermissionAction, tags=["ledger"])
    def post_action(body: ActionRequest):
        origin = origin_or_400(body.origin)
        return service.save_action(db(), origin, body.model_dump())

    @app.post("/policy/analyze", response_model=PolicyAnalyzeResponse, tags=["policy"])
    def policy_analyze(body: PolicyAnalyzeRequest):
        if not body.text.strip():
            raise HTTPException(400, "Paste at least one sentence of a privacy policy.")
        origin = origin_or_400(body.origin) if body.origin else None
        findings = service.analyze_policy(db(), body.text, origin)
        return {"origin": origin, "finding_count": len(findings), "findings": findings}

    # {origin:path} because the extension sends encodeURIComponent(origin) and the
    # server decodes %2F before routing. Specific suffixes are registered first.
    @app.put("/sites/{origin:path}/purpose", response_model=PurposeUpdateResponse, tags=["assessment"])
    def put_purpose(origin: str, body: PurposeUpdateRequest):
        return service.set_purpose(db(), origin_or_400(origin), body.purpose_profile)

    @app.get("/sites/{origin:path}/assessment", response_model=SiteAssessment, tags=["assessment"])
    def get_assessment(origin: str):
        return service.site_assessment(db(), origin_or_400(origin))

    @app.get("/sites/{origin:path}/report", response_class=HTMLResponse, tags=["report"])
    def get_report(origin: str):
        return HTMLResponse(render_report(service.site_detail(db(), origin_or_400(origin))))

    @app.get("/sites/{origin:path}", response_model=SiteDetail, tags=["ledger"])
    def get_site(origin: str):
        return service.site_detail(db(), origin_or_400(origin))

    @app.delete("/sites/{origin:path}", response_model=DeleteResponse, tags=["data"])
    def delete_site(origin: str):
        n = service.delete_site(db(), origin_or_400(origin))
        if not n:
            raise service.NotFound(origin)
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
