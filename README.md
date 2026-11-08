# UltragenGine3D

**A browser-based 3D creation platform.** Build, inspect, edit, generate, and retexture 3D assets in one workspace.

> Project status: active early development. The browser editor and the self-hosted AI job API are implemented. Actual AI inference still requires a separately installed and configured model provider.

## Product vision

UltragenGine3D brings four connected tools into one browser application:

- **Ultragen Engine** — real-time 3D scene viewing, camera navigation, scene hierarchy, transforms, PBR material editing, and GLB/OBJ interchange.
- **AI Generator** — image-to-3D job submission, status tracking, and GLB artifact import through a self-hosted worker.
- **AI Retexture** — model retexturing job submission and GLB artifact delivery through the same worker architecture.
- **Model Editor** — browser-based object selection, transforms, primitive creation, duplication, renaming, and material controls. Sculpting and advanced mesh tools remain in development.

## Implemented

### Browser editor
- React, TypeScript, Vite, and Three.js.
- Real-time WebGL viewport with orbit, zoom, and pan controls.
- Scene hierarchy with selection, add/remove, duplicate, and rename operations.
- Translate, rotate, and scale gizmos plus numeric transform controls.
- PBR base color, metalness, roughness, and opacity controls.
- GLB/glTF and OBJ import; GLB and OBJ export.
- Automatic browser-local scene persistence.\n- Portable .ug3dproj project file save/load with Ctrl+S and Ctrl+O.

### AI service foundation
- FastAPI service with SQLite-backed job records.
- Image-to-3D and retexture upload endpoints.
- Job status polling and GLB artifact download.
- Token-protected worker claim, input, completion, and failure endpoints.
- Browser interfaces for submitting generation and retexture jobs.
- No credit balances, daily credits, or trial credits.

**Important:** TripoSR source and weights are not bundled; operators install them separately in a self-hosted worker. TripoSR implements image-to-3D, not retexturing. Retexturing still requires a separate compatible provider. The frontend does not pretend a model has run when no inference provider is installed.

## Technology

| Area | Technology |
|---|---|
| Web application | React, TypeScript, Vite |
| 3D rendering | Three.js / WebGL |
| 3D interchange | glTF, GLB, OBJ |
| API | Python, FastAPI |
| Job persistence | SQLite |
| Worker transport | Token-protected HTTP API |
| AI inference | Pluggable self-hosted provider adapter |

## Deploy to Vercel

See [docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md) for the Vercel frontend deployment steps and separate API/AI worker requirements.

## Run the web application

Requirements: **Node.js 26.13.0** and npm.

    npm install
    npm run dev

Open the local URL printed by Vite.

Other commands:

    npm run typecheck
    npm run build
    npm run preview

Optional frontend API configuration: copy the root .env.example and set VITE_API_BASE_URL.

## Run the API

Requirements: Python 3.11 or newer.

    cd server
    python -m venv .venv
    # Windows PowerShell:
    .venv\\Scripts\\Activate.ps1
    # macOS/Linux:
    # source .venv/bin/activate
    pip install -r requirements.txt
    copy .env.example .env
    uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

Configure a strong ULTRAGEN_WORKER_TOKEN before running a worker or exposing the API. See server/README.md for the complete API and worker setup.

## Configure an inference worker

The worker defaults to the optional TripoSR adapter. Set TRIPOSR_REPO to its local checkout and follow server/providers/README.md. Custom providers can be loaded through ULTRAGEN_PROVIDER=python.module:ProviderClass. The class must implement:

- generate_image_to_3d(image_path, prompt, output_path)
- retexture_model(model_path, prompt, output_path)

Both methods must write a valid binary GLB to output_path. Install the model-specific runtime and weights on the GPU worker; do not place provider secrets or model weights in the browser application.

Hosted GPU inference has real operating costs. This project does not promise unlimited free hosted generation. Operators can self-host workers and expose capacity under their own infrastructure and policies.

## Repository layout

    src/
      ai/                 # Browser AI job submission and status UI
      engine/             # Three.js scene and viewport
      App.tsx             # Editor workspace and application shell
      styles.css          # Application design system
    server/
      app/                # FastAPI job API
      tests/              # API lifecycle tests
      worker.py           # Pluggable inference worker
      requirements.txt
    docs/                 # Architecture, AI pipeline, and roadmap
    .github/workflows/    # Web and server CI

## Product principles

1. Browser-first: core editing does not require a desktop installation.
2. Real exports: assets remain downloadable and interoperable.
3. No credit system: no paid, trial, or daily generation credits.
4. Honest AI availability: inference requires an actual configured model and compute.
5. Modular architecture: renderer, editor, API, and workers remain separable.
6. Open formats: prioritize glTF/GLB and support OBJ interchange.

## License

MIT. See LICENSE.
