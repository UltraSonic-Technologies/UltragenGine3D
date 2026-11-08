# UltragenGine3D

**A browser-based 3D creation platform.** Build, inspect, edit, generate, and retexture 3D assets in one workspace.

> Project status: early development (0.1.0). The web workspace is the first implementation milestone. AI generation and retexturing are planned modules, not yet represented as working inference services.

## Vision

UltragenGine3D brings four connected tools into one browser application:

- **Ultragen Engine** — real-time 3D scene viewing and manipulation.
- **AI Generator** — image-to-3D workflows with exportable meshes.
- **AI Retexture** — material and texture generation/editing.
- **Model Editor** — tools for inspecting and editing 3D assets.

The project aims to avoid credit-based product restrictions. Hosting AI inference still has real compute costs; the architecture will support self-hosted/open-source inference and clearly disclose any hosted limits rather than claiming unlimited free GPU use.

## Current status

### Implemented in the initial workspace
- React + TypeScript + Vite application.
- Three.js viewport with a lit sample mesh and grid.
- Orbit camera controls.
- Responsive editor shell with scene hierarchy, viewport, and inspector.
- Initial project documentation and development scripts.

### Planned
- GLB/glTF and OBJ import/export.
- Scene graph and object selection.
- Transform gizmos and editable materials.
- Persistent projects and asset library.
- Image-to-3D inference integration.
- AI-assisted PBR texture workflows.
- Backend API and optional self-hosted inference workers.

## Technology

| Area | Initial choice |
|---|---|
| Web application | React, TypeScript, Vite |
| 3D rendering | Three.js |
| Graphics | WebGL initially; WebGPU where supported and useful |
| 3D interchange | glTF/GLB first |
| API (planned) | Python, FastAPI |
| AI inference (planned) | Pluggable open-source model workers |

## Getting started

Requirements: Node.js 20.19+ or 22.12+, and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

### Other commands

```bash
npm run build
npm run preview
npm run typecheck
```

## Repository layout

```text
apps/
  web/                 # (future) separately deployable web app
src/
  engine/              # Three.js scene and viewport
  App.tsx              # editor workspace
  main.tsx             # application entry point
  styles.css           # application design system
docs/                  # architecture and roadmap
```

The initial app currently lives at the repository root to keep first-time setup simple. It can be moved into a workspace layout when the API and inference services are introduced.

## Design principles

1. **Browser-first:** core scene viewing and editing should not require a desktop install.
2. **Real exports:** generated or edited assets should be downloadable, not locked to a preview.
3. **Honest AI availability:** distinguish local/self-hosted inference from hosted compute and never disguise credit limits.
4. **Modular architecture:** renderer, editor tools, asset pipeline, API, and AI workers remain separable.
5. **Interoperability:** prefer documented, widely supported formats such as glTF/GLB.
6. **Progressive enhancement:** advanced graphics features must not make the basic workspace unusable on unsupported devices.

## Roadmap

- [x] Initialize the web application and first 3D viewport.
- [ ] Add scene selection and transform controls.
- [ ] Add model import and export.
- [ ] Add material and lighting editors.
- [ ] Define the asset/project format.
- [ ] Add API service and storage layer.
- [ ] Evaluate open-source image-to-3D models and deployment requirements.
- [ ] Add retexturing pipeline and PBR map inspection.

## Contributing

Contributions are welcome. Keep changes focused, document new modules, and do not commit secrets, model weights, generated user assets, or private datasets.

## License

No license has been selected yet. Until a license is added, all rights are reserved by the copyright holder; do not assume the repository is open source.
