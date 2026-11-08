from __future__ import annotations

import importlib
import io
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from PIL import Image


@pytest.fixture
def api_client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("ULTRAGEN_DATA_DIR", str(tmp_path / "data"))
    monkeypatch.setenv("ULTRAGEN_WORKER_TOKEN", "test-worker-secret")
    monkeypatch.setenv("ULTRAGEN_CORS_ORIGINS", "http://localhost:5173")
    server_root = Path(__file__).resolve().parents[1]
    if str(server_root) not in sys.path:
        sys.path.insert(0, str(server_root))
    import app.main as api
    importlib.reload(api)
    with TestClient(api.app) as client:
        yield client


def png_bytes() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (8, 8), (30, 120, 220)).save(buffer, format="PNG")
    return buffer.getvalue()


def test_image_job_worker_lifecycle_and_artifact(api_client: TestClient):
    created = api_client.post(
        "/api/v1/jobs/generate",
        files={"image": ("reference.png", png_bytes(), "image/png")},
        data={"prompt": "A small metallic robot"},
    )
    assert created.status_code == 202
    job = created.json()
    assert job["status"] == "queued"
    assert job["kind"] == "image-to-3d"

    unauthorized = api_client.post("/api/v1/worker/claim")
    assert unauthorized.status_code == 401

    headers = {"X-Worker-Token": "test-worker-secret"}
    claimed = api_client.post("/api/v1/worker/claim", headers=headers)
    assert claimed.status_code == 200
    worker_job = claimed.json()
    assert worker_job["id"] == job["id"]
    assert worker_job["input_name"] == "reference.png"

    source = api_client.get(worker_job["input_url"], headers=headers)
    assert source.status_code == 200
    assert source.content == png_bytes()

    glb = b"glTF" + b"\x02\x00\x00\x00" + b"\x0c\x00\x00\x00"
    completed = api_client.post(
        f"/api/v1/worker/jobs/{job['id']}/complete",
        headers=headers,
        files={"artifact": ("result.glb", glb, "model/gltf-binary")},
    )
    assert completed.status_code == 200
    status = api_client.get(f"/api/v1/jobs/{job['id']}")
    assert status.status_code == 200
    assert status.json()["status"] == "succeeded"
    artifact = api_client.get(status.json()["artifact_url"])
    assert artifact.status_code == 200
    assert artifact.content == glb


def test_image_upload_rejects_invalid_extension(api_client: TestClient):
    response = api_client.post(
        "/api/v1/jobs/generate",
        files={"image": ("not-an-image.txt", b"nope", "text/plain")},
    )
    assert response.status_code == 415


def test_worker_returns_no_content_when_queue_is_empty(api_client: TestClient):
    response = api_client.post("/api/v1/worker/claim", headers={"X-Worker-Token": "test-worker-secret"})
    assert response.status_code == 204
