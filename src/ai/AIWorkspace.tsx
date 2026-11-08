import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, Cpu, ImagePlus, LoaderCircle, Sparkles, Upload } from "lucide-react";

type Job = {
  id: string;
  kind: "image-to-3d" | "retexture";
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  error?: string | null;
  artifact_url?: string | null;
};

type Props = {
  mode: "generator" | "retexture";
  onArtifact: (file: File) => Promise<void>;
};

export default function AIWorkspace({ mode, onArtifact }: Props) {
  const isGenerator = mode === "generator";
  const [apiUrl, setApiUrl] = useState(import.meta.env.VITE_API_BASE_URL || "http://localhost:8000");
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [job, setJob] = useState<Job | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const completedJobs = useRef(new Set<string>());

  const submit = async () => {
    if (!file) {
      setError(isGenerator ? "Choose a reference image first." : "Choose a GLB or glTF model first.");
      return;
    }
    setBusy(true);
    setError("");
    setJob(null);
    const form = new FormData();
    form.append(isGenerator ? "image" : "model", file);
    form.append("prompt", prompt);
    try {
      const base = apiUrl.trim().replace(/\/$/, "");
      const response = await fetch(base + (isGenerator ? "/api/v1/jobs/generate" : "/api/v1/jobs/retexture"), { method: "POST", body: form });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || "The API rejected this job.");
      setJob(payload as Job);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not connect to the UltragenGine3D API.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!job || (job.status !== "queued" && job.status !== "running")) return;
    let active = true;
    const poll = async () => {
      try {
        const base = apiUrl.trim().replace(/\/$/, "");
        const response = await fetch(base + "/api/v1/jobs/" + job.id);
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.detail || "Could not read job status.");
        if (!active) return;
        const next = payload as Job;
        setJob(next);
        if (next.status === "succeeded" && next.artifact_url && !completedJobs.current.has(next.id)) {
          completedJobs.current.add(next.id);
          const artifactResponse = await fetch(base + next.artifact_url);
          if (!artifactResponse.ok) throw new Error("The job completed, but its GLB artifact could not be downloaded.");
          const artifact = await artifactResponse.blob();
          await onArtifact(new File([artifact], "ultragengine3d-result.glb", { type: "model/gltf-binary" }));
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Job status polling failed.");
      }
    };
    const timer = window.setInterval(() => void poll(), 2500);
    void poll();
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [job?.id, job?.status, apiUrl, onArtifact]);

  return (
    <div className="ai-workspace">
      <div className="ai-workspace-heading">
        <div className="ai-feature-icon">{isGenerator ? <Sparkles size={24} /> : <ImagePlus size={24} />}</div>
        <div>
          <span className="ai-eyebrow">ULTRAGENGINE AI PIPELINE</span>
          <h2>{isGenerator ? "Image to 3D" : "AI Retexture"}</h2>
          <p>{isGenerator ? "Turn a reference image into a real 3D asset, delivered as a GLB model." : "Submit a model for material and texture regeneration while preserving its geometry and UVs where supported."}</p>
        </div>
      </div>

      <div className="ai-form-card">
        <label className="ai-field-label">{isGenerator ? "REFERENCE IMAGE" : "3D MODEL INPUT"}</label>
        <label className="ai-upload-zone">
          <input type="file" accept={isGenerator ? "image/png,image/jpeg,image/webp" : ".glb,.gltf,model/gltf-binary,model/gltf+json"} onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          <span className="ai-upload-icon"><Upload size={19} /></span>
          <strong>{file ? file.name : isGenerator ? "Choose a reference image" : "Choose a GLB or glTF model"}</strong>
          <small>{file ? (file.size / (1024 * 1024)).toFixed(2) + " MB" : isGenerator ? "PNG, JPG, or WebP · up to 20 MB" : "GLB or glTF · up to 20 MB"}</small>
        </label>

        <label className="ai-field-label" htmlFor="ai-prompt">PROMPT / INSTRUCTIONS</label>
        <textarea id="ai-prompt" className="ai-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={isGenerator ? "Describe the object, shape, materials, and details..." : "Describe the new surface, style, colors, and material finish..."} rows={4} />

        <label className="ai-field-label" htmlFor="ai-api-url">SELF-HOSTED API URL</label>
        <input id="ai-api-url" className="ai-api-input" value={apiUrl} onChange={(event) => setApiUrl(event.target.value)} placeholder="http://localhost:8000" />

        <button className="button button-primary ai-submit" onClick={() => void submit()} disabled={busy || !file}>
          {busy ? <LoaderCircle size={15} className="spin" /> : <Sparkles size={15} />}
          {busy ? "Submitting..." : isGenerator ? "Generate 3D model" : "Start retexturing"}
        </button>
        <p className="ai-no-credits"><CheckCircle2 size={14} /> No credits, daily allowances, or trial balances.</p>
      </div>

      <div className="ai-runtime-card">
        <div className="runtime-title"><Cpu size={16} /><strong>Inference runtime</strong><span className="runtime-badge">SELF-HOSTED</span></div>
        <p>Jobs are queued by the API and processed by an operator-managed GPU worker. Configure an open-source model adapter on that worker to enable generation. No model weights or hosted GPU service are bundled with this frontend.</p>
        {job && <div className="job-status-row">
          {job.status === "queued" ? <Clock3 size={15} /> : job.status === "running" ? <LoaderCircle size={15} className="spin" /> : job.status === "succeeded" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          <span>Job {job.id.slice(0, 8)} · {job.status}</span>
          {job.status === "succeeded" && <span className="job-complete">GLB imported</span>}
        </div>}
        {error && <p className="ai-error"><AlertCircle size={14} /> {error}</p>}
        {job?.error && <p className="ai-error"><AlertCircle size={14} /> {job.error}</p>}
      </div>
    </div>
  );
}
