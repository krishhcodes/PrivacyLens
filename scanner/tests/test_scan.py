import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
import scan  # noqa: E402

FIX = HERE / "fixture_Preferences.json"


def test_parse_fixture():
    found = scan.parse_preferences(FIX)
    assert set(found) == {"http://localhost:5500", "https://maps.example.com", "https://weather.example",
                          "https://meet.example.com", "https://news.example", "https://docs.example", "https://flash.example"}
    local = {o["permission"]: o for o in found["http://localhost:5500"]}
    assert local["location"]["browser_setting"] == "allow" and local["camera"]["browser_setting"] == "block"
    assert local["location"]["setting_changed_at"] == "2024-10-04T10:40:00Z"
    assert found["https://weather.example"][0]["browser_setting"] == "allow"  # nested variant key
    assert {o["permission"] for o in found["https://meet.example.com"]} == {"camera", "microphone"}


def test_origin_patterns():
    assert scan.origin_from_pattern("https://a.example:443,*") == "https://a.example"
    assert scan.origin_from_pattern("http://a.example:80,*") == "http://a.example"
    assert scan.origin_from_pattern("http://localhost:5500,*") == "http://localhost:5500"
    assert scan.origin_from_pattern("https://[*.]a.example,*") is None
    assert scan.origin_from_pattern("chrome-extension://abc,*") is None


def test_dry_run_cli(capsys):
    assert scan.main(["--preferences", str(FIX), "--dry-run"]) == 0
    assert "meet.example.com" in capsys.readouterr().out


def test_extra_types():
    found = scan.parse_preferences(FIX)
    news = {o["permission"]: o["browser_setting"] for o in found["https://news.example"]}
    assert news == {"notifications": "allow", "popups": "allow"}
    assert found["https://docs.example"][0]["permission"] == "clipboard"
    assert found["https://flash.example"] == [found["https://flash.example"][0]]
    assert found["https://flash.example"][0]["permission"] == "usb"  # usb_chooser_data is not a rule: skipped
