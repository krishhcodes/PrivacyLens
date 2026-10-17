#!/usr/bin/env python3
"""ConsentScope local scanner.

Reads the site permissions Chrome / Edge / Brave have saved on this computer
(every site, not just the open tab) and uploads them to the ConsentScope backend.

    python3 scan.py --dry-run                      # just print what it finds
    python3 scan.py --api http://127.0.0.1:8000    # upload to the backend

Read-only: it never changes browser settings (use the extension for that).
Standard library only. Reads the browser's "Preferences" file, an internal
format that browsers may change; unknown entries are skipped, not guessed.
"""
import argparse
import json
import os
import platform
import sys
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Preferences key -> our permission name. Prefix match covers variants like geolocation_with_options.
KEYS = {
    "geolocation": "location",
    "media_stream_camera": "camera",
    "media_stream_mic": "microphone",
    "notifications": "notifications",
    # extras (shown, not scored)
    "popups": "popups",
    "clipboard": "clipboard",
    "sensors": "sensors",
    "automatic_downloads": "automatic_downloads",
    "midi_sysex": "midi_sysex",
    "usb_guard": "usb",
    "serial_guard": "serial",
    "hid_guard": "hid",
    "bluetooth_guard": "bluetooth",
    "file_system_write_guard": "file_system_write",
    "window_placement": "window_management",
    "idle_detection": "idle_detection",
    "local_fonts": "local_fonts",
    "ar": "ar",
    "vr": "vr",
    "protected_media_identifier": "protected_media",
    "background_sync": "background_sync",
    "payment_handler": "payment_handler",
    "storage_access": "storage_access",
}
SETTING = {1: "allow", 2: "block", 3: "ask"}
WEBKIT_EPOCH = datetime(1601, 1, 1, tzinfo=timezone.utc)


def browser_roots() -> dict[str, Path]:
    home = Path.home()
    system = platform.system()
    if system == "Windows":
        local = Path(os.environ.get("LOCALAPPDATA", home / "AppData" / "Local"))
        return {
            "chrome": local / "Google" / "Chrome" / "User Data",
            "edge": local / "Microsoft" / "Edge" / "User Data",
            "brave": local / "BraveSoftware" / "Brave-Browser" / "User Data",
        }
    if system == "Darwin":
        base = home / "Library" / "Application Support"
        return {
            "chrome": base / "Google" / "Chrome",
            "edge": base / "Microsoft Edge",
            "brave": base / "BraveSoftware" / "Brave-Browser",
        }
    cfg = Path(os.environ.get("XDG_CONFIG_HOME", home / ".config"))
    return {
        "chrome": cfg / "google-chrome",
        "chromium": cfg / "chromium",
        "edge": cfg / "microsoft-edge",
        "brave": cfg / "BraveSoftware" / "Brave-Browser",
    }


def find_preferences(browsers: list[str]) -> list[tuple[str, str, Path]]:
    """Return (browser, profile, path) for every profile found."""
    found = []
    for name, root in browser_roots().items():
        if browsers and name not in browsers:
            continue
        if not root.is_dir():
            continue
        for prof in sorted(root.iterdir()):
            pref = prof / "Preferences"
            if prof.is_dir() and (prof.name == "Default" or prof.name.startswith("Profile ")) and pref.is_file():
                found.append((name, prof.name, pref))
    return found


def webkit_to_iso(value) -> str | None:
    try:
        micros = int(value)
    except (TypeError, ValueError):
        return None
    if micros <= 0:
        return None
    return (WEBKIT_EPOCH + timedelta(microseconds=micros)).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def origin_from_pattern(pattern: str) -> str | None:
    """'https://example.com:443,*' -> 'https://example.com'. Wildcard patterns are skipped."""
    primary = pattern.split(",", 1)[0].strip()
    if "*" in primary or "://" not in primary:
        return None
    scheme, rest = primary.split("://", 1)
    scheme = scheme.lower()
    if scheme not in ("http", "https"):
        return None
    host = rest.split("/", 1)[0].lower()
    default = ":443" if scheme == "https" else ":80"
    if host.endswith(default):
        host = host[: -len(default)]
    return f"{scheme}://{host}" if host else None


def parse_preferences(path: Path) -> dict[str, list[dict]]:
    """origin -> list of observations."""
    with open(path, encoding="utf-8") as f:
        prefs = json.load(f)
    exceptions = prefs.get("profile", {}).get("content_settings", {}).get("exceptions", {})
    by_origin: dict[str, dict[str, dict]] = {}
    for key, entries in exceptions.items():
        permission = next((p for k, p in KEYS.items() if key == k or key.startswith(k + "_")), None)
        if not permission or not isinstance(entries, dict):
            continue
        for pattern, entry in entries.items():
            origin = origin_from_pattern(pattern)
            raw = entry.get("setting") if isinstance(entry, dict) else None
            if isinstance(raw, dict):  # some variants nest the value
                raw = raw.get("setting", raw.get("value"))
            setting = SETTING.get(raw) if isinstance(raw, int) else None
            if not origin or not setting:
                continue
            obs = {
                "permission": permission,
                "browser_setting": setting,
                "page_state": "not_checked",
                "setting_changed_at": webkit_to_iso(entry.get("last_modified")),
            }
            prev = by_origin.setdefault(origin, {}).get(permission)
            # if both a plain and a variant key exist, keep the most recently changed
            if not prev or (obs["setting_changed_at"] or "") > (prev["setting_changed_at"] or ""):
                by_origin[origin][permission] = obs
    return {o: list(p.values()) for o, p in sorted(by_origin.items())}


def upload(api: str, origin: str, observations: list[dict], token: str | None = None) -> dict:
    body = json.dumps({"origin": origin, "source": "local_scan", "observations": observations}).encode()
    headers = {"Content-Type": "application/json"}
    if token:  # hosted backend with accounts: a device token from the website (Settings → Account)
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{api.rstrip('/')}/audits", data=body, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.load(r)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Read saved site permissions from Chrome/Edge/Brave and send them to ConsentScope.")
    ap.add_argument("--api", default="http://127.0.0.1:8000", help="backend URL (default: %(default)s)")
    ap.add_argument("--browser", action="append", choices=["chrome", "chromium", "edge", "brave"], help="limit to a browser (repeatable)")
    ap.add_argument("--preferences", type=Path, help="read this Preferences file instead of searching")
    ap.add_argument("--dry-run", action="store_true", help="print findings, don't upload")
    ap.add_argument("--token", default=os.environ.get("CONSENTSCOPE_TOKEN"),
                    help="device token from the website (Settings → Account) when the backend has sign-in; "
                         "or set CONSENTSCOPE_TOKEN")
    args = ap.parse_args(argv)

    sources = [("file", args.preferences.parent.name, args.preferences)] if args.preferences else find_preferences(args.browser or [])
    if not sources:
        print("No Chrome, Edge or Brave profile found. Use --preferences <path to Preferences file>.", file=sys.stderr)
        return 1

    merged: dict[str, list[dict]] = {}
    for browser, profile, path in sources:
        try:
            found = parse_preferences(path)
        except (OSError, json.JSONDecodeError) as e:
            print(f"Skipping {browser}/{profile}: {e}", file=sys.stderr)
            continue
        print(f"{browser}/{profile}: {len(found)} site(s) with saved permission rules")
        for origin, obs in found.items():
            merged.setdefault(origin, []).extend(obs)
            for o in obs:
                print(f"  {origin:45} {o['permission']:19} {o['browser_setting']:6} changed {o['setting_changed_at'] or 'unknown'}")

    allowed = sum(1 for obs in merged.values() for o in obs if o["browser_setting"] == "allow")
    print(f"Total: {len(merged)} site(s), {allowed} allowed permission(s)")
    if args.dry_run or not merged:
        return 0
    ok = failed = 0
    for origin, obs in merged.items():
        # several profiles may hold the same site: one observation per permission, newest wins
        latest = {}
        for o in sorted(obs, key=lambda x: x["setting_changed_at"] or ""):
            latest[o["permission"]] = o
        try:
            upload(args.api, origin, list(latest.values()), args.token)
            ok += 1
        except (urllib.error.URLError, OSError) as e:
            failed += 1
            print(f"Upload failed for {origin}: {e}", file=sys.stderr)
    print(f"Uploaded {ok} site(s) to {args.api}" + (f", {failed} failed" if failed else ""))
    return 0 if not failed else 2


if __name__ == "__main__":
    sys.exit(main())
