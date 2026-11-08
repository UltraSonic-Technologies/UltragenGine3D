from __future__ import annotations

import importlib
import os
import tempfile
import time
from pathlib import Path
from typing import Protocol

import requests


class InferenceProvider(Protocol):
    def generate_image_to_3d(self, image_path: Path, prompt: str, output_path: Path) -> None: ...
    def retexture_model(self, model_path: Path, prompt: str, output_path: Path) -> None: ...


def load_provider() -> InferenceProvider:
    target = os.getenv("ULTRAGEN_PROVIDER", "").strip()
    if not target or ":" not in target:
        raise RuntimeError(
            "No inference provider is configured. Set ULTRAGEN_PROVIDER=python.module:ProviderClass. "
            "The API queue is ready, but model weights are not bundled."
        )
    module_name, class_name = target.split(":", 1)
    provider_type = getattr(importlib.import_module(module_name), class_name)
    return provider_type()


def main() -> None:
    api_url = os.getenv("ULTRAGEN_API_URL", "http://127.0.0.1:8000").rstrip("/")
    token = os.getenv("ULTRAGEN_WORKER_TOKEN", "")
    poll_seconds = float(os.getenv("ULTRAGEN_POLL_SECONDS", "3"))
    if not token:
        raise RuntimeError("ULTRAGEN_WORKER_TOKEN is required.")
    provider = load_provider()
    headers = {"X-Worker-Token": token}
    print("UltragenGine3D worker connected. Waiting for jobs.")
    while True:
        claim = requests.post(f"{api_url}/api/v1/worker/claim", headers=headers, timeout=30)
        if claim.status_code == 204:
            time.sleep(poll_seconds)
            continue
        claim.raise_for_status()
        job = claim.json()
        try:
            with tempfile.TemporaryDirectory(prefix="ultragen-job-") as temp_dir:
                work = Path(temp_dir)
                response = requests.get(api_url + job["input_url"], headers=headers, timeout=120)
                response.raise_for_status()
                input_path = work / ("input" + Path(job["input_name"]).suffix.lower())
                input_path.write_bytes(response.content)
                output_path = work / "result.glb"
                if job["kind"] == "image-to-3d":
                    provider.generate_image_to_3d(input_path, job["prompt"], output_path)
                elif job["kind"] == "retexture":
                    provider.retexture_model(input_path, job["prompt"], output_path)
                else:
                    raise ValueError(f"Unsupported job kind: {job['kind']}")
                if not output_path.is_file():
                    raise RuntimeError("Provider returned without writing a GLB artifact.")
                with output_path.open("rb") as artifact:
                    complete = requests.post(
                        f"{api_url}/api/v1/worker/jobs/{job['id']}/complete",
                        headers=headers,
                        files={"artifact": ("result.glb", artifact, "model/gltf-binary")},
                        timeout=300,
                    )
                complete.raise_for_status()
                print(f"Completed {job['id']}")
        except Exception as error:
            requests.post(
                f"{api_url}/api/v1/worker/jobs/{job['id']}/fail",
                headers={**headers, "Content-Type": "application/json"},
                json={"error": str(error)},
                timeout=30,
            )
            print(f"Job {job['id']} failed: {error}")


if __name__ == "__main__":
    main()
