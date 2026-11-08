# TripoSR image-to-3D provider

UltragenGine3D includes an adapter for the MIT-licensed TripoSR model from Tripo AI and Stability AI. The upstream model reconstructs a mesh from one image and can bake a texture atlas. Its upstream documentation describes a default run using about 6 GB of VRAM; actual needs and speed depend on resolution and hardware.

Upstream source: https://github.com/VAST-AI-Research/TripoSR
Upstream model card: https://huggingface.co/stabilityai/TripoSR

## Install the model separately

The model repository and weights are not vendored into this project. This keeps the web application small and lets each worker operator choose its own GPU environment.

1. Clone the upstream TripoSR repository to a local machine that has a supported NVIDIA CUDA environment.
2. Follow its official installation instructions and install its pinned model dependencies in a dedicated Python environment.
3. Install this API's dependencies from server/requirements.txt in the worker environment, including the trimesh export dependency.
4. Download model weights through the upstream model loader on first use, or pre-cache them in the worker environment.
5. Configure the variables below and start the UltragenGine3D worker.

Example worker configuration:

    ULTRAGEN_PROVIDER=providers.triposr_provider:TripoSRProvider
    TRIPOSR_REPO=/absolute/path/to/TripoSR
    TRIPOSR_PYTHON=/absolute/path/to/triposr-venv/bin/python
    TRIPOSR_DEVICE=cuda:0
    TRIPOSR_TEXTURE_RESOLUTION=1024
    TRIPOSR_TIMEOUT_SECONDS=1800

On Windows, set TRIPOSR_PYTHON to the dedicated environment's python.exe.

TripoSR's upstream command supports CPU fallback, but CPU inference can be substantially slower. GPU availability, CUDA/PyTorch compatibility, model download, and GPU memory must be verified on the worker itself.

## Scope and limitations

- This adapter implements image-to-3D only.
- It writes a UV-textured GLB artifact using TripoSR's baked texture atlas.
- The optional prompt field is accepted by the common job API but ignored by TripoSR because the model is image-conditioned.
- This adapter does not retexture an existing model. The retexture API remains pluggable and will report a clear unsupported-provider failure until a separate UV-preserving retexture model is configured.
- The adapter does not promise a particular generation time or quality.

## License and attribution

TripoSR source code and pretrained model weights are released under the MIT License by Tripo AI and Stability AI. Keep the upstream copyright and license notice with redistributed copies. See the upstream repository's LICENSE file before redistributing model code or weights.
