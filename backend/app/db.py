"""Persistence: SQLite (local mode, tests) or Postgres (hosted, e.g. Supabase). No ORM.

Every user-owned table carries user_id; local mode stores everything under the "local" user.
The same SQL runs on both engines: `?` placeholders are rewritten to `%s` for Postgres.
"""
import os
import sqlite3
import threading
from contextlib import contextmanager
from datetime import datetime, timezone

LOCAL_USER = "local"

SCHEMA = """
CREATE TABLE IF NOT EXISTS websites (
  user_id TEXT NOT NULL,
  origin TEXT NOT NULL,
  display_name TEXT NOT NULL,
  purpose_profile TEXT NOT NULL,
  purpose_source TEXT NOT NULL,
  purpose_confidence TEXT NOT NULL,
  first_audited_at TEXT,
  last_audited_at TEXT,
  PRIMARY KEY (user_id, origin)
);
CREATE TABLE IF NOT EXISTS observations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  origin TEXT NOT NULL,
  permission TEXT NOT NULL,
  browser_setting TEXT NOT NULL,
  page_state TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  source TEXT NOT NULL,
  provenance TEXT NOT NULL,
  seq INTEGER NOT NULL,
  setting_changed_at TEXT,
  FOREIGN KEY (user_id, origin) REFERENCES websites(user_id, origin) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS obs_origin ON observations(user_id, origin, permission, observed_at);
CREATE TABLE IF NOT EXISTS actions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  origin TEXT NOT NULL,
  permission TEXT NOT NULL,
  action TEXT NOT NULL,
  before_setting TEXT NOT NULL,
  after_setting TEXT NOT NULL,
  succeeded INTEGER NOT NULL,
  error TEXT,
  acted_at TEXT NOT NULL,
  seq INTEGER NOT NULL,
  FOREIGN KEY (user_id, origin) REFERENCES websites(user_id, origin) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS policy_analyses (
  user_id TEXT NOT NULL,
  origin TEXT NOT NULL,
  analyzed_at TEXT NOT NULL,
  text_length INTEGER NOT NULL,
  PRIMARY KEY (user_id, origin),
  FOREIGN KEY (user_id, origin) REFERENCES websites(user_id, origin) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS policy_findings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  origin TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  char_start INTEGER NOT NULL,
  char_end INTEGER NOT NULL,
  category TEXT NOT NULL,
  rule_id TEXT NOT NULL,
  explanation TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  evidence_type TEXT NOT NULL,
  provenance TEXT NOT NULL,
  seq INTEGER NOT NULL,
  FOREIGN KEY (user_id, origin) REFERENCES websites(user_id, origin) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS safety_checks (
  origin TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  threats TEXT NOT NULL,
  checked_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS device_tokens (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  label TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_used_at TEXT
);
"""
# safety_checks is a shared cache of Google Safe Browsing results per public origin (no user data).
# device_tokens stores only a SHA-256 of each token, never the token itself.

USER_TABLES = ("websites", "observations", "actions", "policy_analyses", "policy_findings")


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def parse_iso(s: str) -> datetime:
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


def _statements(script: str) -> list[str]:
    return [s.strip() for s in script.split(";") if s.strip()]


class _PgConn:
    """Gives a psycopg connection the sqlite3 calling style used in service.py (`?` params)."""

    def __init__(self, conn):
        self._conn = conn

    def execute(self, sql: str, params=()):
        return self._conn.execute(sql.replace("?", "%s"), params)


class Database:
    def __init__(self, target: str):
        """target: a SQLite file path, ":memory:", or a postgres:// / postgresql:// URL."""
        self.is_postgres = target.startswith(("postgres://", "postgresql://"))
        self._target = target
        self._lock = threading.RLock()
        if self.is_postgres:
            self._connect_pg()
            with self.tx() as c:
                for stmt in _statements(SCHEMA):
                    c.execute(stmt)
        else:
            if target != ":memory:":
                os.makedirs(os.path.dirname(os.path.abspath(target)), exist_ok=True)
            self._conn = sqlite3.connect(target, check_same_thread=False)
            self._conn.row_factory = _dict_row
            self._conn.execute("PRAGMA foreign_keys = ON")
            self._migrate_sqlite()
            self._conn.executescript(SCHEMA)
        with self.tx() as c:
            self._seq = c.execute(
                "SELECT COALESCE(MAX(m), 0) AS m FROM (SELECT MAX(seq) AS m FROM observations UNION ALL "
                "SELECT MAX(seq) FROM actions UNION ALL SELECT MAX(seq) FROM policy_findings) t"
            ).fetchone()["m"]

    def _connect_pg(self):
        import psycopg
        from psycopg.rows import dict_row
        # prepare_threshold=None: Supabase's pooler (pgbouncer) does not support prepared statements.
        self._conn = psycopg.connect(self._target, row_factory=dict_row, prepare_threshold=None, connect_timeout=10)

    def _migrate_sqlite(self):
        """Databases from before accounts: every row becomes the local user's."""
        tables = {r["name"] for r in self._conn.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}
        if "websites" not in tables:
            return
        cols = {r["name"] for r in self._conn.execute("PRAGMA table_info(websites)")}
        if "user_id" in cols:
            return
        obs_cols = {r["name"] for r in self._conn.execute("PRAGMA table_info(observations)")}
        if "setting_changed_at" not in obs_cols:
            self._conn.execute("ALTER TABLE observations ADD COLUMN setting_changed_at TEXT")
        self._conn.execute("PRAGMA foreign_keys = OFF")
        for t in USER_TABLES:
            if t in tables:
                self._conn.execute(f"ALTER TABLE {t} RENAME TO old_{t}")
        self._conn.execute("DROP INDEX IF EXISTS obs_origin")
        self._conn.executescript(SCHEMA)
        for t in USER_TABLES:
            if t in tables:
                old = [r["name"] for r in self._conn.execute(f"PRAGMA table_info(old_{t})")]
                names = ", ".join(old)
                self._conn.execute(
                    f"INSERT INTO {t} (user_id, {names}) SELECT ?, {names} FROM old_{t}", (LOCAL_USER,))
                self._conn.execute(f"DROP TABLE old_{t}")
        self._conn.commit()
        self._conn.execute("PRAGMA foreign_keys = ON")

    def next_seq(self) -> int:
        self._seq += 1
        return self._seq

    @contextmanager
    def tx(self):
        """Serialize access; commit on success, roll back on error."""
        with self._lock:
            if self.is_postgres:
                if self._conn.closed or self._conn.broken:
                    self._connect_pg()  # the pooler drops idle connections
                c = _PgConn(self._conn)
            else:
                c = self._conn
            try:
                yield c
                self._conn.commit()
            except Exception:
                self._conn.rollback()
                raise

    def close(self):
        self._conn.close()


def _dict_row(cursor, row):
    return {d[0]: v for d, v in zip(cursor.description, row)}
