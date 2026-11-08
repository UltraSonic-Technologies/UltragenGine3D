# AI generation and retexturing pipeline

This document describes the intended integration boundary. It does not claim that an AI model is already deployed.

## Product requirements

- Image-to-3D is the first generator workflow.
- Results must be real, downloadable geometry, not a preview-only asset.
- Retexturing is a separate workflow that operates on an existing model and its UV/material data.
- Prefer open model weights and self-hostable inference components.
- Do not use credit balances, daily credit allowances, or trial credits as the product's core access mechanism.

## Honest compute model

Inference consumes GPU memory, processing time, storage, and bandwidth. A public hosted service therefore needs an explicit operating model. Possible modes:

1. **Local execution:** run a compatible model on the user's own hardware where browser/runtime constraints permit.
2. **Self-hosted deployment:** users or operators deploy inference workers on their own GPU infrastructure.
3. **Community-hosted service:** shared capacity with transparent queueing, fair-use limits, and published operating costs.

The application must not label hosted generation as unlimited or free unless the infrastructure is actually funded and available on those terms.

## Proposed job lifecycle

1. Browser validates the input image and supported file types.
2. API creates a job and returns a stable job identifier.
3. Worker claims the job and records progress.
4. Worker stores generated geometry and associated textures as artifacts.
5. API reports completion or a useful failure reason.
6. Browser loads the resulting GLB and offers a download.

## Provider adapter

Keep model-specific code behind an adapter so model weights, runtimes, and hosting providers can change without rewriting the editor UI.

Suggested job states: `queued`, `running`, `succeeded`, `failed`, and `cancelled`.

Every job should record the model/version, execution mode, duration, output format, and any resource limit that affected the result.

## Retexturing outputs

The target output is a material set compatible with glTF PBR workflows. Where supported, preserve the original mesh and UV layout while producing base color, normal, roughness, and metallic maps. Unsupported or missing maps must be reported rather than silently fabricated.
