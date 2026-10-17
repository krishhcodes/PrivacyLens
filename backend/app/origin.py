"""Origin normalization. Must stay identical to the extension's lib/origin.ts."""
from urllib.parse import urlsplit


class InvalidOrigin(ValueError):
    pass


def normalize_origin(url: str) -> str:
    """Return scheme://host[:port], lowercase, default ports dropped, www. kept."""
    if not isinstance(url, str) or not url.strip():
        raise InvalidOrigin(f"Invalid URL: {url!r}")
    try:
        parts = urlsplit(url.strip())
        port = parts.port  # raises ValueError on a bad port
    except ValueError as e:
        raise InvalidOrigin(f"Invalid URL: {url}") from e
    scheme = parts.scheme.lower()
    if scheme not in ("http", "https"):
        raise InvalidOrigin(f"Non-http(s) URL: {url}")
    host = (parts.hostname or "").lower()
    if not host:
        raise InvalidOrigin(f"Invalid URL: {url}")
    default = 80 if scheme == "http" else 443
    suffix = f":{port}" if port is not None and port != default else ""
    if ":" in host:  # IPv6 literal
        host = f"[{host}]"
    return f"{scheme}://{host}{suffix}"


def display_name(origin: str) -> str:
    return origin.split("://", 1)[1]


def hostname(origin: str) -> str:
    return urlsplit(origin).hostname or ""
