"""Purpose inference (§6.1) and the purpose–permission matrix (§6.2)."""
import re

from ..origin import hostname

LIMITATION_NOTE = "Inference: based on the site's assumed purpose, not on observed data use."

# Order matters: first hit wins.
KEYWORDS: list[tuple[str, tuple[str, ...]]] = [
    ("calculator", ("calc", "calculator", "convert", "converter")),
    ("video_meeting", ("meet", "zoom", "call", "webex", "teams")),
    ("maps", ("map", "maps", "nav", "navigation", "directions")),
    ("weather", ("weather", "forecast")),
]

PROFILE_LABEL = {
    "calculator": "calculator",
    "video_meeting": "video-meeting site",
    "maps": "maps site",
    "weather": "weather site",
    "general": "general website",
}


def infer_purpose(origin: str, page_title: str | None = None) -> tuple[str, str]:
    """Return (profile, confidence). medium on a keyword hit, low otherwise.

    Matches hostname labels and title words, e.g. "pocketcalc" hits "calc".
    Keywords shorter than 4 letters ("map", "nav") must start a word, so "canvas" is not "nav".
    """
    words_in = [w for w in re.split(r"[^a-z0-9]+", f"{hostname(origin)} {page_title or ''}".lower()) if w]
    for profile, keywords in KEYWORDS:
        for k in keywords:
            if any((k in w) if len(k) >= 4 else w.startswith(k) for w in words_in):
                return profile, "medium"
    return "general", "low"


# None = expected (no finding). Values are (severity, rule_id).
MATRIX: dict[str, dict[str, tuple[str, str] | None]] = {
    "calculator": {
        "location": ("high", "MIS-01"),
        "camera": ("high", "MIS-02"),
        "microphone": ("high", "MIS-03"),
        "notifications": ("review", "MIS-05"),
    },
    "video_meeting": {
        "location": ("review", "MIS-06"),
        "camera": None,
        "microphone": None,
        "notifications": ("info", "MIS-07"),
    },
    "maps": {
        "location": None,
        "camera": ("review", "MIS-08"),
        "microphone": ("review", "MIS-09"),
        "notifications": ("info", "MIS-07"),
    },
    "weather": {
        "location": ("info", "MIS-04"),
        "camera": ("review", "MIS-08"),
        "microphone": ("review", "MIS-09"),
        "notifications": ("info", "MIS-07"),
    },
    "general": {
        "location": ("review", "MIS-10"),
        "camera": ("review", "MIS-10"),
        "microphone": ("review", "MIS-10"),
        "notifications": ("info", "MIS-07"),
    },
}

PERM_NOUN = {"location": "location", "camera": "camera", "microphone": "microphone", "notifications": "notifications"}


def _explain(profile: str, permission: str, severity: str, rule_id: str) -> str:
    noun = PERM_NOUN[permission]
    label = PROFILE_LABEL[profile]
    article = "an" if label[0] in "aeiou" else "a"
    if rule_id == "MIS-04":
        return ("A weather site can use your location, but typing a city works too. "
                "Consider whether you want to keep location access.")
    if rule_id == "MIS-07":
        return f"Notifications are allowed. They are not sensitive data, but they let {article} {label} reach you at any time."
    if severity == "high":
        return f"{article.capitalize()} {label} rarely needs your {noun}. This combination merits review."
    return f"{article.capitalize()} {label} doesn't obviously need your {noun}. Worth a look."


def is_active(obs: dict) -> bool:
    """A finding exists only for allow / granted. 'ask' never counts."""
    return obs["browser_setting"] == "allow" or obs["page_state"] == "granted"


def find_mismatches(profile: str, latest: dict[str, dict]) -> list[dict]:
    """latest: permission -> latest observation dict."""
    out = []
    for permission in ("location", "camera", "microphone", "notifications"):
        obs = latest.get(permission)
        if not obs or not is_active(obs):
            continue
        rule = MATRIX[profile][permission]
        if rule is None:
            continue
        severity, rule_id = rule
        out.append({
            "permission": permission,
            "browser_setting": obs["browser_setting"],
            "page_state": obs["page_state"],
            "profile": profile,
            "rule_id": rule_id,
            "severity": severity,
            "explanation": _explain(profile, permission, severity, rule_id),
            "limitation_note": LIMITATION_NOTE,
            "provenance": "inferred",
            "_evidence": obs["id"],
        })
    return out
