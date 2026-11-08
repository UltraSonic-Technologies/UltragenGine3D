# UltragenGine3D API and inference worker

This is the self-hostable job service for image-to-3D generation and model retexturing. It has **no credit system**. Jobs are queued and processed by a separately operated GPU worker.

## Current status

- FastAPI job API with persistent SQLite job records.
- Image upload validation for PNG, JPG, and WebP.
- GLB/glTF upload validation for retexturing jobs.
- Worker-token protected claim, input download, completion, and failure endpoints.
- GLB artifact delivery.
- Provider adapter interface for local or self-hosted inference.

**No image-to-3D or retexturing model weights are bundled yet.** The worker intentionally refuses to start until a provider adapter is configured. This avoids fake progress or fabricated AI results.

## Run the API

Python 3.11 or newer is recommended.

    cd server
    python -m venv .venv
    # Windows PowerShell:
    .venv\Scripts\Activate.ps1
    # macOS/Linux:
    # source .venv/bin/activate
    pip install -r requirements.txt
    copy .env.example .env
    uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

Set a strong ULTRAGEN_WORKER_TOKEN before exposing the API. Configure ULTRAGEN_CORS_ORIGINS for the frontend origin. Uploaded files and the SQLite database are stored under ULTRAGEN_DATA_DIR.

## Connect a model

Create a Python class implementing these methods:

    class MyProvider:
        def generate_image_to_3d(self, image_path, prompt, output_path):
            # Run an image-to-3D model and write a binary GLB to output_path.
            ...

        def retexture_model(self, model_path, prompt, output_path):
            # Preserve the mesh and UVs where supported; write a binary GLB.
            ...

The repository includes a TripoSR image-to-3D adapter. Set TRIPOSR_REPO to the local upstream checkout and use ULTRAGEN_PROVIDER=providers.triposr_provider:TripoSRProvider. See providers/README.md for the exact setup. TripoSR does not implement retexturing; a separate retexture provider is required.

For a custom adapter, set ULTRAGEN_PROVIDER=my_adapter:MyProvider, install its model-specific dependencies, then run:

    python worker.py

The worker polls the API, downloads queued inputs, invokes the configured provider, and uploads the resulting GLB. Keep the worker token secret; never put it in browser code.

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | /health | Service and worker readiness |
| POST | /api/v1/jobs/generate | Queue image-to-3D |
| POST | /api/v1/jobs/retexture | Queue model retexturing |
| GET | /api/v1/jobs/{id} | Read job status |
| GET | /api/v1/jobs/{id}/artifact | Download completed GLB |
| POST | /api/v1/worker/claim | Worker claims next queued job |
| GET | /api/v1/worker/jobs/{id}/input | Worker downloads input |
| POST | /api/v1/worker/jobs/{id}/complete | Worker uploads GLB |
| POST | /api/v1/worker/jobs/{id}/fail | Worker reports a failure |

The API is an orchestration foundation, not a hosted inference service. GPU hosting, model licensing, capacity, and operational costs must be arranged by whoever deploys the worker.
