"""API host must not be indexed."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_root_sends_noindex_header():
    response = client.get("/")
    assert response.status_code == 200
    assert response.headers["x-robots-tag"] == "noindex, nofollow"


def test_health_live_sends_noindex_header():
    response = client.get("/health/live")
    assert response.status_code == 200
    assert response.headers["x-robots-tag"] == "noindex, nofollow"


def test_unknown_path_sends_noindex_header():
    response = client.get("/not-a-real-route")
    assert response.headers["x-robots-tag"] == "noindex, nofollow"


def test_robots_txt_disallows_all():
    response = client.get("/robots.txt")
    assert response.status_code == 200
    assert "User-agent: *" in response.text
    assert "Disallow: /" in response.text
    assert response.headers["x-robots-tag"] == "noindex, nofollow"
