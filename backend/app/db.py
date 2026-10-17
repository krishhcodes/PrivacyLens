"""SQLite persistence (stdlib sqlite3, no ORM)."""
import os
import sqlite3
import threading
from contextlib import contextmanager
from datetime import datetime, timezone

SCHEMA = """
CREATE TABLE IF NOT EXISTS websites (
  origin TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  purpose_profile TEXT NOT NULL,
  purpose_source TEXT NOT NULL,
  purpose_confidence TEXT NOT NULL,
  first_audited_at TEXT,
  last_audited_at TEXT
);
CREATE TABLE IF NOT EXISTS observations (
  id TEXT PRIMARY KEY,
  origin TEXT NOT NULL REFERENCES websites(origin) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  browser_setting TEXT NOT NULL,
  page_state TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  source TEXT NOT NULL,
  provenance TEXT NOT NULL,
  seq INTEGER NOT NULL,
  setting_changed_at TEXT
);
CREATE INDEX IF NOT EXISTS obs_origin ON observations(origin, permission, observed_at);
CREATE TABLE IF NOT EXISTS actions (
  id TEXT PRIMARY KEY,
  origin TEXT NOT NULL REFERENCES websites(origin) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  action TEXT NOT NULL,
  before_setting TEXT NOT NULL,
  after_setting TEXT NOT NULL,
  succeeded INTEGER NOT NULL,
  error TEXT,
  acted_at TEXT NOT NULL,
  seq INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS policy_analyses (
  origin TEXT PRIMARY KEY REFERENCES websites(origin) ON DELETE CASCADE,
  analyzed_at TEXT NOT NULL,
  text_length INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS policy_findings (
  id TEXT PRIMARY KEY,
  origin TEXT NOT NULL REFERENCES websites(origin) ON DELETE CASCADE,
  excerpt TEXT NOT NULL,
  char_start INTEGER NOT NULL,
  char_end INTEGER NOT NULL,
  category TEXT NOT NULL,
  rule_id TEXT NOT NULL,
  explanation TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  evidence_type TEXT NOT NULL,
  provenance TEXT NOT NULL,
  seq INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS safety_checks (
  origin TEXT PRIMARY KEY,
  status TEXT NOT NULL,       -- safe | unsafe | error
  threats TEXT NOT NULL,      -- JSON list of Google Safe Browsing threat types
  checked_at TEXT NOT NULL
);
"""


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def parse_iso(s: str) -> datetime:
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


class Database:
    def __init__(self, path: str):
        self.path = path
        if path != ":memory:":
            os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
        self._conn = sqlite3.connect(path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA foreign_keys = ON")
        self._conn.executescript(SCHEMA)
        cols = {r[1] for r in self._conn.execute("PRAGMA table_info(observations)")}
        if "setting_changed_at" not in cols:  # databases created before the scanner existed
            self._conn.execute("ALTER TABLE observations ADD COLUMN setting_changed_at TEXT")
        self._lock = threading.RLock()
        self._seq = self._conn.execute(
            "SELECT COALESCE(MAX(m), 0) FROM (SELECT MAX(seq) m FROM observations UNION ALL "
            "SELECT MAX(seq) FROM actions UNION ALL SELECT MAX(seq) FROM policy_findings)"
        ).fetchone()[0]

    def next_seq(self) -> int:
        self._seq += 1
        return self._seq

    @contextmanager
    def tx(self):
        """Serialize access; commit on success, roll back on error."""
        with self._lock:
            try:
                yield self._conn
                self._conn.commit()
            except Exception:
                self._conn.rollback()
                raise

    def close(self):
        self._conn.close()
