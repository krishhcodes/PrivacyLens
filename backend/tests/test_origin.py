import pytest

from app.origin import InvalidOrigin, normalize_origin


@pytest.mark.parametrize("url,expected", [
    ("https://www.Google.COM/search?q=foo", "https://www.google.com"),
    ("http://localhost:5500/index.html", "http://localhost:5500"),
    ("http://example.com:80/", "http://example.com"),
    ("https://example.com:443", "https://example.com"),
    ("https://example.com:8443/x", "https://example.com:8443"),
    ("http://localhost:5500", "http://localhost:5500"),
    ("https://www.example.com/", "https://www.example.com"),
])
def test_normalize(url, expected):
    assert normalize_origin(url) == expected


@pytest.mark.parametrize("url", ["chrome://extensions", "file:///etc/passwd", "", "not a url", "http://", "javascript:alert(1)", "http://x:99999"])
def test_rejects(url):
    with pytest.raises(InvalidOrigin):
        normalize_origin(url)
