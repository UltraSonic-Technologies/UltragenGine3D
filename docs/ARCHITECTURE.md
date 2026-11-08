# Architecture

## Current application

The repository contains a Vite + React browser application and a separate Python API service. The Three.js renderer is isolated in src/engine; React owns the editor shell, inspectors, and AI job submission UI.

## Module boundaries

- **Engine core:** scene lifecycle, renderer, camera, lighting, render loop, GLB/glTF and OBJ interchange, and resource disposal.
- **Editor:** scene hierarchy, selection, transform tools, object naming/duplication, and PBR material inspector.
- **Asset persistence:** automatic browser-local scene snapshots. Downloadable project bundles and a managed asset library remain future work.
- **Generator UI:** image upload, prompt submission, job polling, and GLB artifact import.
- **Retexture UI:** model upload, prompt submission, job polling, and GLB artifact import.
- **API:** FastAPI endpoints, SQLite job state, input validation, worker authentication, and artifact delivery.
- **Inference worker:** separately operated process that loads a configured provider adapter and runs model-specific code.

## API and worker trust boundary

The browser can create jobs and read job status/artifacts. Only workers receive the private worker token. The token must never be compiled into frontend assets. The API validates upload suffixes, image decoding, artifact size, and GLB container headers. Production deployment still requires user authentication, rate limiting, queue quotas, retention policies, and secure reverse-proxy configuration.

## AI infrastructure principles

The frontend does not embed model weights or provider secrets. Inference is pluggable and self-hosted by default. The API must not report inference as ready unless a real provider is configured. No fake progress, fabricated completed meshes, or credit balances are part of the product.

## 3D asset formats

Prioritize glTF/GLB for runtime delivery and PBR materials. OBJ is supported for interchange but has limitations around materials, UV workflows, and scene hierarchy.

## Lifecycle requirements

Every renderer, geometry, material, texture, event listener, observer, and animation frame created by a component must have a corresponding cleanup path. Imported nested meshes must be removed from their actual parent, and exports must preserve their world transforms.
