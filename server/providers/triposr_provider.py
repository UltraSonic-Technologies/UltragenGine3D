from __future__ import annotations

import os
import subprocess
import sys
import tempfile
from pathlib import Path

import trimesh
from PIL import Image
from trimesh.visual.material import PBRMaterial
from trimesh.visual.texture import TextureVisuals


class TripoSRProvider:
    """Self-hosted TripoSR image-to-mesh adapter.

    TripoSR supports image-to-3D only. It is not used as a fake retexturing model.
    """

    def __init__(self) -> None:
        configured_repo = os.getenv("TRIPOSR_REPO", "").strip()
        if not configured_repo:
            raise RuntimeError("Set TRIPOSR_REPO to the local VAST-AI-Research/TripoSR checkout.")
        self.repo = Path(configured_repo).expanduser().resolve()
        self.run_script = self.repo / "run.py"
        if not self.run_script.is_file():
            raise RuntimeError(f"TripoSR run.py was not found in {self.repo}")
        self.python = os.getenv("TRIPOSR_PYTHON", sys.executable)
        self.device = os.getenv("TRIPOSR_DEVICE", "cuda:0")
        self.texture_resolution = int(os.getenv("TRIPOSR_TEXTURE_RESOLUTION", "1024"))
        self.timeout = int(os.getenv("TRIPOSR_TIMEOUT_SECONDS", "1800"))

    def generate_image_to_3d(self, image_path: Path, prompt: str, output_path: Path) -> None:
        del prompt  # TripoSR is image-conditioned and does not accept a text prompt.
        with tempfile.TemporaryDirectory(prefix="triposr-output-") as temp_dir:
            output_dir = Path(temp_dir)
            command = [
                self.python,
                str(self.run_script),
                str(image_path),
                "--device", self.device,
                "--output-dir", str(output_dir),
                "--model-save-format", "obj",
                "--bake-texture",
                "--texture-resolution", str(self.texture_resolution),
            ]
            subprocess.run(
                command,
                cwd=self.repo,
                check=True,
                timeout=self.timeout,
                capture_output=True,
                text=True,
            )
            mesh_path = output_dir / "0" / "mesh.obj"
            texture_path = output_dir / "0" / "texture.png"
            if not mesh_path.is_file() or not texture_path.is_file():
                raise RuntimeError("TripoSR did not produce the expected textured OBJ and texture atlas.")

            loaded = trimesh.load(mesh_path, force="mesh", process=False)
            if not isinstance(loaded, trimesh.Trimesh):
                raise RuntimeError("TripoSR output could not be loaded as a triangle mesh.")
            uv = getattr(loaded.visual, "uv", None)
            if uv is None:
                raise RuntimeError("TripoSR output has no UV coordinates; a textured GLB cannot be created.")

            with Image.open(texture_path) as source_texture:
                texture = source_texture.convert("RGBA")
            material = PBRMaterial(
                name="TripoSR Generated Material",
                baseColorTexture=texture,
                metallicFactor=0.0,
                roughnessFactor=0.82,
                alphaMode="OPAQUE",
            )
            loaded.visual = TextureVisuals(uv=uv, material=material)
            glb_data = trimesh.exchange.gltf.export_glb(loaded)
            output_path.write_bytes(glb_data)

    def retexture_model(self, model_path: Path, prompt: str, output_path: Path) -> None:
        del model_path, prompt, output_path
        raise NotImplementedError(
            "TripoSR is an image-to-3D reconstruction model, not a retexturing model. "
            "Configure a separate UV-preserving PBR retexture provider."
        )
