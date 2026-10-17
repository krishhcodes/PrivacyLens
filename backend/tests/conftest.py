import pytest
from fastapi.testclient import TestClient

from app.main import create_app

DEMO = "http://localhost:5500"
ENC = "http%3A%2F%2Flocalhost%3A5500"  # encodeURIComponent(DEMO), as the extension sends it


def ledger(location="allow", loc_state="granted", camera="ask", mic="ask", notif="block", at=None):
    obs = [
        {"permission": "location", "browser_setting": location, "page_state": loc_state},
        {"permission": "camera", "browser_setting": camera, "page_state": "prompt"},
        {"permission": "microphone", "browser_setting": mic, "page_state": "prompt"},
        {"permission": "notifications", "browser_setting": notif, "page_state": "denied" if notif == "block" else "prompt"},
    ]
    if at:
        for o in obs:
            o["observed_at"] = at
    return obs


@pytest.fixture
def client():
    with TestClient(create_app(":memory:")) as c:
        yield c


@pytest.fixture
def demo(client):
    r = client.post("/audits", json={"origin": DEMO + "/index.html", "page_title": "PocketCalc — Calculator",
                                     "observations": ledger()})
    assert r.status_code == 200
    return client
