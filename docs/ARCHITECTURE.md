# Architecture

## Current application

The first milestone is a single Vite + React application. The Three.js renderer is isolated in `src/engine`; the React workspace owns editor chrome and UI state.

## Intended module boundaries

- **Engine core:** scene lifecycle, renderer, camera, lighting, render loop, resource disposal.
- **Editor:** selection, transform tools, hierarchy, inspectors, undo/redo.
- **Asset pipeline:** import validation, format conversion, thumbnails, export.
- **Generator adapter:** job submission/status/result contract. Model inference is not part of the browser UI.
- **Retexture adapter:** material/texture jobs and PBR output validation.
- **API:** authentication, projects, asset metadata, job orchestration.
- **Inference workers:** independently deployable model processes with explicit resource and queue limits.

## AI infrastructure principles

The frontend must not embed model weights or provider secrets. AI work should be submitted to a backend adapter. The adapter should make the execution location clear (local, self-hosted, or hosted), report queue/resource limits, and return downloadable artifacts. No fake progress or fabricated completed meshes.

## 3D asset formats

Prioritize glTF/GLB for runtime delivery and PBR materials. OBJ can be supported as an interchange import/export option, with known limitations around materials and scene structure.

## Lifecycle requirements

Every renderer, geometry, material, texture, event listener, observer, and animation frame created by a component must have a corresponding cleanup path.
