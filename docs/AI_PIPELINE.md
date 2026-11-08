# AI generation and retexturing pipeline

## Implemented service boundary

The repository now contains a FastAPI job service in server/app and a separate polling worker in server/worker.py.

- POST /api/v1/jobs/generate accepts PNG, JPG, and WebP images.
- POST /api/v1/jobs/retexture accepts GLB/glTF model uploads.
- GET /api/v1/jobs/{id} reports queued, running, succeeded, or failed status.
- GET /api/v1/jobs/{id}/artifact delivers the completed binary GLB.
- Worker endpoints are protected by a server-side token and support claiming jobs, downloading inputs, reporting failures, and uploading artifacts.
- SQLite stores job state; uploaded inputs and output artifacts are stored in the configured data directory.
- The React workspaces submit jobs, poll their status, and import the resulting GLB into the active scene.

The Python API has automated lifecycle tests in server/tests. The web and server pipelines run separately in GitHub Actions.

## Model provider status

**Inference models are not bundled or deployed yet.** The worker loads a provider class from ULTRAGEN_PROVIDER=python.module:ProviderClass. The class must implement:

    generate_image_to_3d(image_path, prompt, output_path)
    retexture_model(model_path, prompt, output_path)

Each method must write a valid binary GLB. Model-specific dependencies, weights, GPU configuration, and licensing must be supplied by the worker operator. The browser does not contain model weights or worker secrets.

## Product requirements

- Image-to-3D must return real downloadable geometry, not a preview-only asset.
- Retexturing must preserve original mesh geometry and UVs where the selected model supports that.
- PBR output should include base color, normal, roughness, and metallic maps when generated and supported.
- Do not use credit balances, daily credit allowances, or trial credits as the product's access mechanism.

## Honest compute model

Inference consumes GPU memory, processing time, storage, and bandwidth. A public hosted service therefore needs an explicit operating model. Supported deployment directions:

1. Local execution where the selected model and hardware permit it.
2. Self-hosted deployment on operator-controlled GPU infrastructure.
3. Community-hosted capacity with transparent queueing, fair-use limits, and published operating costs.

The project does not claim unlimited free hosted GPU generation. No inference-ready status should be reported until a real provider is configured and validated.

## Job lifecycle

1. Browser validates file type and submits the input and prompt.
2. API validates the upload, stores it, and creates a queued job.
3. Worker claims the next queued job using a private worker token.
4. Worker downloads the input and invokes the configured provider.
5. Worker uploads a binary GLB or reports a failure.
6. Browser polls job status, downloads the artifact, and imports it into the scene.

## Provider adapter contract

Keep model-specific code behind the provider interface so model weights, runtimes, and hosting providers can change without rewriting the editor UI. Do not expose provider secrets to the browser.

Every job records its type, prompt, original filename, state, timestamps, and any failure message. Future versions should add model/version metadata, worker heartbeat and recovery, queue limits, artifact retention policies, and structured progress reporting.

## Retexturing output contract

The target output is a GLB with the original geometry and UV layout preserved where supported. Material outputs should include base color, normal, roughness, and metallic maps where available. Missing maps or unsupported UV layouts must be reported rather than silently fabricated.
