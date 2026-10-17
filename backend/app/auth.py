"""Who is calling: a Supabase sign-in token, a ConsentScope device token, or nobody (local mode).

Local mode (SUPABASE_URL and SUPABASE_JWT_SECRET unset): no sign-in, every request is the
"local" user, exactly like the laptop setup before accounts existed.

Hosted mode: every request except /health needs `Authorization: Bearer <token>`, where the token is
- a Supabase access token (the website gets one when you sign in), checked against the project's
  public signing keys (or SUPABASE_JWT_SECRET for projects that still use the legacy shared secret), or
- a device token ("cs_..."), created on the website for the extension or the scanner.
"""
import base64
import hashlib
import hmac
import os
import secrets
import time
import uuid
from dataclasses import dataclass

import jwt
from fastapi import HTTPException, Request

from .db import LOCAL_USER, Database, now_iso

DEVICE_PREFIX = "cs_"
REPORT_LINK_TTL = 600  # seconds a signed report link stays valid


@dataclass
class User:
    id: str
    email: str | None
    via: str  # "local" | "session" | "device"


def supabase_url() -> str:
    return os.environ.get("SUPABASE_URL", "").rstrip("/")


def enabled() -> bool:
    return bool(supabase_url() or os.environ.get("SUPABASE_JWT_SECRET"))


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


class Authenticator:
    def __init__(self, db: Database):
        self.db = db
        self.jwt_secret = os.environ.get("SUPABASE_JWT_SECRET") or None
        url = supabase_url()
        self.jwks = jwt.PyJWKClient(f"{url}/auth/v1/.well-known/jwks.json", cache_keys=True) if url else None
        # Report links are opened as plain links (no headers), so they carry a short-lived signature.
        self._link_key = (os.environ.get("REPORT_LINK_SECRET") or secrets.token_hex(32)).encode()

    # ---------- requests ----------
    def user(self, request: Request) -> User:
        if not enabled():
            return User(LOCAL_USER, None, "local")
        header = request.headers.get("authorization", "")
        if not header.lower().startswith("bearer "):
            raise HTTPException(401, "Sign in to use ConsentScope.")
        return self.from_token(header[7:].strip())

    def from_token(self, token: str) -> User:
        if token.startswith(DEVICE_PREFIX):
            return self._device_user(token)
        try:
            alg = jwt.get_unverified_header(token).get("alg")
            if alg == "HS256":
                if not self.jwt_secret:
                    raise jwt.InvalidTokenError("HS256 token but SUPABASE_JWT_SECRET is not set")
                key = self.jwt_secret
            else:
                if not self.jwks:
                    raise jwt.InvalidTokenError("SUPABASE_URL is not set")
                key = self.jwks.get_signing_key_from_jwt(token).key
            claims = jwt.decode(token, key, algorithms=["HS256", "ES256", "RS256"], audience="authenticated")
        except (jwt.PyJWTError, ValueError) as e:
            raise HTTPException(401, f"Your sign-in is invalid or expired. Sign in again. ({type(e).__name__})")
        if not claims.get("sub"):
            raise HTTPException(401, "Your sign-in has no user id.")
        return User(claims["sub"], claims.get("email"), "session")

    def _device_user(self, token: str) -> User:
        with self.db.tx() as c:
            row = c.execute("SELECT id, user_id FROM device_tokens WHERE token_hash = ?", (hash_token(token),)).fetchone()
            if row is None:
                raise HTTPException(401, "This device token was revoked or never existed. Create a new one on the website.")
            c.execute("UPDATE device_tokens SET last_used_at = ? WHERE id = ?", (now_iso(), row["id"]))
        return User(row["user_id"], None, "device")

    # ---------- device tokens ----------
    def create_device_token(self, user: User, label: str) -> dict:
        token = DEVICE_PREFIX + secrets.token_urlsafe(32)
        rec = {"id": str(uuid.uuid4()), "label": label, "created_at": now_iso(), "last_used_at": None}
        with self.db.tx() as c:
            c.execute(
                "INSERT INTO device_tokens (id, token_hash, user_id, label, created_at) VALUES (?,?,?,?,?)",
                (rec["id"], hash_token(token), user.id, label, rec["created_at"]))
        return {**rec, "token": token}

    def list_device_tokens(self, user: User) -> list[dict]:
        with self.db.tx() as c:
            return list(c.execute(
                "SELECT id, label, created_at, last_used_at FROM device_tokens WHERE user_id = ? ORDER BY created_at",
                (user.id,)))

    def revoke_device_token(self, user: User, token_id: str) -> int:
        with self.db.tx() as c:
            return c.execute("DELETE FROM device_tokens WHERE id = ? AND user_id = ?", (token_id, user.id)).rowcount

    def revoke_all_device_tokens(self, user: User) -> int:
        with self.db.tx() as c:
            return c.execute("DELETE FROM device_tokens WHERE user_id = ?", (user.id,)).rowcount

    # ---------- signed report links ----------
    def _sig(self, uid: str, origin: str, exp: int) -> str:
        mac = hmac.new(self._link_key, f"{uid}\n{origin}\n{exp}".encode(), hashlib.sha256).digest()
        return base64.urlsafe_b64encode(mac).decode().rstrip("=")

    def report_link_params(self, user: User, origin: str) -> dict:
        exp = int(time.time()) + REPORT_LINK_TTL
        return {"u": user.id, "exp": str(exp), "sig": self._sig(user.id, origin, exp)}

    def report_link_user(self, origin: str, u: str, exp: str, sig: str) -> User | None:
        try:
            exp_i = int(exp)
        except ValueError:
            return None
        if exp_i < time.time() or not hmac.compare_digest(sig, self._sig(u, origin, exp_i)):
            return None
        return User(u, None, "link")
