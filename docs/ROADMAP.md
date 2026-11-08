# Roadmap

## Milestone 0.1 — Workspace foundation
- [x] React + TypeScript + Vite bootstrap
- [x] Three.js viewport
- [x] Orbit camera controls
- [x] Dark editor shell
- [ ] Verify build in CI

## Milestone 0.2 — Scene editing
- [x] Scene graph sourced from Three.js meshes
- [x] Object selection via raycasting
- [x] Translate, rotate, and scale gizmos
- [x] Add box, sphere, cylinder, and torus primitives
- [x] Remove selected objects
- [x] Editable transform inspector
- [ ] Undo/redo command history
- [ ] Multi-select and grouping

## Milestone 0.3 — Asset pipeline
- [x] GLB/glTF import
- [x] GLB export
- [x] OBJ import/export
- [ ] Asset metadata and validation
- [ ] Texture and geometry resource cleanup for imported hierarchies

## Milestone 0.4 — Materials
- [x] Material inspector
- [x] PBR property editing (base color, metalness, roughness, opacity)
- [ ] Texture map preview
- [ ] Environment and lighting controls

## Milestone 0.5 — AI services
- [ ] Compare open-source image-to-3D models
- [ ] Benchmark hardware requirements and output quality
- [ ] Define asynchronous job API
- [ ] Add worker adapter and artifact delivery
- [ ] Define retexturing workflow and PBR outputs

## Later
- [ ] Browser project persistence and asset library
- [ ] Optional user accounts and cloud sync
- [ ] Collaboration
- [ ] WebGPU renderer path where beneficial

## Product constraints
- No credit-based generation system: no paid, trial, or daily credits.
- AI inference must use a realistically funded hosted service or user-operated compute. Unlimited hosted GPU generation cannot be promised without sustainable infrastructure.
