from __future__ import annotations

import os
import secrets
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from PIL import Image
from pydantic import BaseModel

APP_VERSION = "0.1.0"
DATA_DIR = Path(os.getenv("ULTRAGEN_DATA_DIR", "./data")).resolve()
INPUT_DIR = DATA_DIR / "inputs"
OUTPUT_DIR = DATA_DIR / "outputs"
DB_PATH = DATA_DIR / "jobs.sqlite3"
MAX_UPLOAD_BYTES = int(os.getenv("ULTRAGEN_MAX_UPLOAD_MB", "20")) * 1024 * 1024
WORKER_TOKEN = os.getenv("ULTRAGEN_WORKER_TOKEN", "")
for directory in (INPUT_DIR, OUTPUT_DIR):
    directory.mkdir(parents=True, exist_ok=True)


def connect_db() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH, timeout=30)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_db() -> None:
    with connect_db() as db:
        db.execute("""
            CREATE TABLE IF NOT EXISTS jobs (
                id TEXT PRIMARY KEY, kind TEXT NOT NULL, status TEXT NOT NULL,
                prompt TEXT NOT NULL, input_name TEXT NOT NULL, input_path TEXT NOT NULL,
                output_path TEXT, error TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
            )
        """)
        db.execute("CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON jobs(status, created_at)")


initialize_db()
app = FastAPI(title="UltragenGine3D API", version=APP_VERSION)
origins = [value.strip() for value in os.getenv("ULTRAGEN_CORS_ORIGINS", "http://localhost:5173").split(",") if value.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=False, allow_methods=["GET", "POST"], allow_headers=["Content-Type", "X-Worker-Token"])


class JobStatus(BaseModel):
    id: str
    kind: Literal["image-to-3d", "retexture"]
    status: Literal["queued", "running", "succeeded", "failed", "cancelled"]
    prompt: str
    input_name: str
    error: str | None = None
    created_at: str
    updated_at: str
    artifact_url: str | None = None


class WorkerClaim(BaseModel):
    id: str
    kind: str
    prompt: str
    input_url: str


class WorkerFailure(BaseModel):
    error: str


def require_worker(x_worker_token: str | None = Header(default=None)) -> None:
    if not WORKER_TOKEN:
        raise HTTPException(status_code=503, detail="Worker access is disabled. Configure ULTRAGEN_WORKER_TOKEN.")
    if not x_worker_token or not secrets.compare_digest(x_worker_token, WORKER_TOKEN):
        raise HTTPException(status_code=401, detail="Invalid worker token.")


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def row_to_job(row: sqlite3.Row) -> JobStatus:
    return JobStatus(
        id=row["id"], kind=row["kind"], status=row["status"], prompt=row["prompt"],
        input_name=row["input_name"], error=row["error"], created_at=row["created_at"],
        updated_at=row["updated_at"],
        artifact_url=f"/api/v1/jobs/{row['id']}/artifact" if row["status"] == "succeeded" else None,
    )


async def read_upload(file: UploadFile, expected: Literal["image", "model"]) -> bytes:
    data = await file.read(MAX_UPLOAD_BYTES + 1)
    if not data:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Upload exceeds the configured size limit.")
    suffix = Path(file.filename or "").suffix.lower()
    if expected == "image":
        if suffix not in {".png", ".jpg", ".jpeg", ".webp"}:
            raise HTTPException(status_code=415, detail="Use a PNG, JPG, or WebP image.")
        try:
            from io import BytesIO
            with Image.open(BytesIO(data)) as image:
                image.verify()
        except Exception as exc:
            raise HTTPException(status_code=415, detail="The uploaded image could not be decoded.") from exc
    elif suffix not in {".glb", ".gltf"}:
        raise HTTPException(status_code=415, detail="Retexturing currently accepts GLB or glTF input.")
    return data


def create_job(kind: str, prompt: str, filename: str, data: bytes) -> JobStatus:
    job_id = str(uuid.uuid4())
    stamp = now()
    input_path = INPUT_DIR / f"{job_id}{Path(filename).suffix.lower()}"
    input_path.write_bytes(data)
    with connect_db() as db:
        db.execute(
            "INSERT INTO jobs(id,kind,status,prompt,input_name,input_path,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)",
            (job_id, kind, "queued", prompt.strip(), Path(filename).name, str(input_path), stamp, stamp),
        )
        row = db.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
    return row_to_job(row)


@app.get("/health")
def health() -> dict:
    with connect_db() as db:
        queued = db.execute("SELECT COUNT(*) FROM jobs WHERE status='queued'").fetchone()[0]
    return {"status": "ok", "version": APP_VERSION, "worker_configured": bool(WORKER_TOKEN), "queued_jobs": queued, "inference_ready": False}


@app.post("/api/v1/jobs/generate", response_model=JobStatus, status_code=202)
async def generate_image_to_3d(image: UploadFile = File(...), prompt: str = "") -> JobStatus:
    return create_job("image-to-3d", prompt, image.filename or "input-image.png", await read_upload(image, "image"))


@app.post("/api/v1/jobs/retexture", response_model=JobStatus, status_code=202)
async def retexture_model(model: UploadFile = File(...), prompt: str = "") -> JobStatus:
    return create_job("retexture", prompt, model.filename or "input-model.glb", await read_upload(model, "model"))


@app.get("/api/v1/jobs/{job_id}", response_model=JobStatus)
def get_job(job_id: str) -> JobStatus:
    with connect_db() as db:
        row = db.execute("SELECT * FROM jobs WHERE id=?", (job_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    return row_to_job(row)


@app.get("/api/v1/jobs/{job_id}/artifact")
def get_artifact(job_id: str):
    with connect_db() as db:
        row = db.execute("SELECT status,output_path FROM jobs WHERE id=?", (job_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    if row["status"] != "succeeded" or not row["output_path"]:
        raise HTTPException(status_code=409, detail="This job has no completed artifact.")
    artifact = Path(row["output_path"])
    if not artifact.is_file():
        raise HTTPException(status_code=410, detail="The generated artifact is no longer available.")
    return FileResponse(artifact, media_type="model/gltf-binary", filename=f"ultragengine3d-{job_id}.glb")


@app.post("/api/v1/worker/claim", response_model=WorkerClaim, dependencies=[Depends(require_worker)])
def claim_job() -> WorkerClaim:
    with connect_db() as db:
        db.execute("BEGIN IMMEDIATE")
        row = db.execute("SELECT * FROM jobs WHERE status='queued' ORDER BY created_at LIMIT 1").fetchone()
        if row is None:
            raise HTTPException(status_code=204, detail="No queued jobs.")
        db.execute("UPDATE jobs SET status='running',updated_at=? WHERE id=? AND status='queued'", (now(), row["id"]))
    return WorkerClaim(id=row["id"], kind=row["kind"], prompt=row["prompt"], input_url=f"/api/v1/worker/jobs/{row['id']}/input")


@app.get("/api/v1/worker/jobs/{job_id}/input", dependencies=[Depends(require_worker)])
def get_worker_input(job_id: str):
    with connect_db() as db:
        row = db.execute("SELECT input_path,input_name FROM jobs WHERE id=? AND status='running'", (job_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Running job not found.")
    path = Path(row["input_path"])
    if not path.is_file():
        raise HTTPException(status_code=410, detail="Job input is unavailable.")
    return FileResponse(path, filename=row["input_name"])


@app.post("/api/v1/worker/jobs/{job_id}/complete", dependencies=[Depends(require_worker)])
async def complete_job(job_id: str, artifact: UploadFile = File(...)) -> dict:
    data = await artifact.read(MAX_UPLOAD_BYTES * 4)
    if len(data) < 12 or data[:4] != b"glTF":
        raise HTTPException(status_code=415, detail="Worker output must be a binary GLB file.")
    output_path = OUTPUT_DIR / f"{job_id}.glb"
    output_path.write_bytes(data)
    with connect_db() as db:
        result = db.execute("UPDATE jobs SET status='succeeded',output_path=?,error=NULL,updated_at=? WHERE id=? AND status='running'", (str(output_path), now(), job_id))
    if result.rowcount != 1:
        output_path.unlink(missing_ok=True)
        raise HTTPException(status_code=409, detail="Job is not in the running state.")
    return {"id": job_id, "status": "succeeded"}


@app.post("/api/v1/worker/jobs/{job_id}/fail", dependencies=[Depends(require_worker)])
def fail_job(job_id: str, failure: WorkerFailure) -> dict:
    with connect_db() as db:
        result = db.execute("UPDATE jobs SET status='failed',error=?,updated_at=? WHERE id=? AND status='running'", (failure.error[:1000], now(), job_id))
    if result.rowcount != 1:
        raise HTTPException(status_code=409, detail="Job is not in the running state.")
    return {"id": job_id, "status": "failed"}
