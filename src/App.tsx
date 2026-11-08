import { useCallback, useRef, useState } from "react";
import {
  Box, ChevronDown, CircleHelp, Cloud, Code2, Download, Eye,
  FolderOpen, Grid2X2, Image, Layers3, Lightbulb,
  Maximize2, MousePointer2, Move3D, Rotate3D, Settings2,
  Shapes, SlidersHorizontal, Sparkles, Upload, Trash2,
} from "lucide-react";
import Viewport, { type PrimitiveKind, type SceneObjectInfo, type TransformTool, type ViewportHandle } from "./engine/Viewport";

type Workspace = "engine" | "generator" | "retexture" | "editor";
const workspaceLabels: Record<Workspace, string> = {
  engine: "Ultragen Engine", generator: "AI Generator", retexture: "AI Retexture", editor: "Model Editor",
};

export default function App() {
  const viewportRef = useRef<ViewportHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [workspace, setWorkspace] = useState<Workspace>("engine");
  const [selected, setSelected] = useState<SceneObjectInfo | null>(null);
  const [objects, setObjects] = useState<SceneObjectInfo[]>([]);
  const [tool, setTool] = useState<TransformTool>("select");
  const [showGrid, setShowGrid] = useState(true);
  const [notice, setNotice] = useState("Ready");
  const [inspectorTab, setInspectorTab] = useState<"object" | "material">("object");

  const handleSelection = useCallback((object: SceneObjectInfo | null) => setSelected(object), []);
  const handleScene = useCallback((next: SceneObjectInfo[]) => setObjects(next), []);
  const addPrimitive = (kind: PrimitiveKind) => viewportRef.current?.addPrimitive(kind);
  const exportScene = async () => {
    try { await viewportRef.current?.exportGLB(); setNotice("GLB export complete"); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Export failed"); }
  };
  const importScene = async (file?: File) => {
    if (!file) return;
    try { if (file.name.toLowerCase().endsWith(".obj")) await viewportRef.current?.importOBJ(file); else await viewportRef.current?.importGLB(file); setNotice(`Imported ${file.name}`); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Import failed"); }
    finally { if (fileInputRef.current) fileInputRef.current.value = ""; }
  };
  const setValue = (axis: "position" | "rotation" | "scale", index: number, raw: string) => {
    const value = Number(raw);
    if (Number.isFinite(value)) viewportRef.current?.setTransform(axis, index, value);
  };
  const setMaterialValue = (property: "color" | "metalness" | "roughness" | "opacity", value: string | number) => {
    viewportRef.current?.setMaterial(property, value);
  };
  const valuesFor = (axis: "position" | "rotation" | "scale") => {
    if (!selected) return [0, 0, 0];
    return axis === "position" ? selected.position : axis === "rotation"
      ? selected.rotation.map((value) => value * 180 / Math.PI) as [number, number, number]
      : selected.scale;
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="UltragenGine3D home"><span className="brand-mark"><Shapes size={20} /></span><span>ultragen<span className="brand-accent">gine</span>3d</span><span className="version">0.2.0</span></a>
        <div className="project-name"><span className="status-dot" /> Untitled Project <ChevronDown size={14} /></div>
        <div className="top-actions">
          <input ref={fileInputRef} type="file" accept=".glb,.gltf,.obj,model/gltf-binary,model/gltf+json,text/plain" hidden onChange={(event) => void importScene(event.target.files?.[0])} />
          <button className="icon-button" title="Import GLB/glTF" onClick={() => fileInputRef.current?.click()}><FolderOpen size={17} /></button>
          <button className="icon-button" title="Remove selected object" onClick={() => viewportRef.current?.removeSelected()} disabled={!selected}><Trash2 size={16} /></button>
          <button className="button button-muted" onClick={() => setNotice("Project is currently stored in this browser session") }><Cloud size={15} /> Local project</button>
          <button className="button button-muted" onClick={() => void viewportRef.current?.exportOBJ().then(() => setNotice("OBJ export complete")).catch((error) => setNotice(error instanceof Error ? error.message : "OBJ export failed"))}><Download size={15} /> Export OBJ</button>
          <button className="button button-primary" onClick={() => void exportScene()}><Download size={15} /> Export GLB</button>
          <button className="icon-button" title="Settings"><Settings2 size={17} /></button>
        </div>
      </header>

      <nav className="workspace-nav" aria-label="Workspace">
        <button className={workspace === "engine" ? "nav-item active" : "nav-item"} onClick={() => setWorkspace("engine")}><Box size={16} /> Engine</button>
        <button className={workspace === "generator" ? "nav-item active" : "nav-item"} onClick={() => setWorkspace("generator")}><Sparkles size={16} /> AI Generator <span className="soon">planned</span></button>
        <button className={workspace === "retexture" ? "nav-item active" : "nav-item"} onClick={() => setWorkspace("retexture")}><Image size={16} /> Retexture <span className="soon">planned</span></button>
        <button className={workspace === "editor" ? "nav-item active" : "nav-item"} onClick={() => setWorkspace("editor")}><Move3D size={16} /> Model Editor <span className="soon">planned</span></button>
        <div className="nav-spacer" /><span className="nav-caption">BROWSER WORKSPACE</span>
      </nav>

      <section className="editor-layout">
        <aside className="panel left-panel">
          <div className="panel-heading"><span>SCENE</span><div><select className="add-object-select" aria-label="Add primitive" defaultValue="" onChange={(event) => { if (event.target.value) addPrimitive(event.target.value as PrimitiveKind); event.target.value = ""; }}><option value="" disabled>+ Add</option><option value="box">Box</option><option value="sphere">Sphere</option><option value="cylinder">Cylinder</option><option value="torus">Torus</option></select></div></div>
          <div className="scene-search"><Grid2X2 size={14} /><span>Scene collection</span><ChevronDown size={13} /></div>
          <div className="tree-list">
            <div className="tree-row"><ChevronDown size={13} /><Layers3 size={15} /><span>Scene</span></div>
            <div className="tree-row indent"><Lightbulb size={14} /><span>Lighting</span></div>
            {objects.map((object) => <button key={object.id} className={selected?.id === object.id ? "tree-row indent selected" : "tree-row indent"} onClick={() => {
              // Selection is also available by clicking the mesh in the viewport.
              setSelected(object);
              window.dispatchEvent(new CustomEvent("ultragen-select-object", { detail: object.id }));
            }}><Box size={14} /><span>{object.name}</span><Eye size={13} className="tree-eye" /></button>)}
          </div>
          <div className="panel-foot"><span className="mini-dot" /> {objects.length} mesh {objects.length === 1 ? "object" : "objects"}</div>
        </aside>

        <section className="center-workspace">
          <div className="viewport-toolbar">
            <div className="tool-group">
              <button className={tool === "select" ? "tool-button active" : "tool-button"} onClick={() => setTool("select")} title="Select"><MousePointer2 size={16} /></button>
              <button className={tool === "move" ? "tool-button active" : "tool-button"} onClick={() => setTool("move")} title="Move"><Move3D size={16} /></button>
              <button className={tool === "rotate" ? "tool-button active" : "tool-button"} onClick={() => setTool("rotate")} title="Rotate"><Rotate3D size={16} /></button>
              <button className={tool === "scale" ? "tool-button active" : "tool-button"} onClick={() => setTool("scale")} title="Scale"><Maximize2 size={16} /></button>
            </div>
            <div className="tool-divider" />
            <button className={showGrid ? "tool-button active" : "tool-button"} onClick={() => setShowGrid(!showGrid)} title="Toggle grid"><Grid2X2 size={16} /></button>
            <div className="viewport-spacer" /><span className="viewport-mode">PERSPECTIVE <ChevronDown size={12} /></span><button className="tool-button" title="Viewport help"><CircleHelp size={16} /></button>
          </div>
          {workspace === "engine" ? <div className="viewport-wrap">
            <Viewport ref={viewportRef} showGrid={showGrid} tool={tool} onSelectionChange={handleSelection} onSceneChange={handleScene} />
            <div className="viewport-label"><span className="live-dot" /> REAL-TIME VIEWPORT</div>
            <div className="axis-widget"><span className="axis-y">Y</span><span className="axis-x">X</span><span className="axis-z">Z</span><span className="axis-center" /></div>
            <div className="viewport-hint">Select: click · Orbit: drag · Zoom: scroll · Pan: right-drag</div>
          </div> : <div className="planned-workspace"><div className="planned-icon">{workspace === "generator" ? <Sparkles size={28} /> : workspace === "retexture" ? <Image size={28} /> : <Move3D size={28} />}</div><h2>{workspaceLabels[workspace]}</h2><p>This module is on the UltragenGine3D roadmap. The 3D Engine workspace is the first active implementation.</p><span className="planned-tag">PLANNED MODULE</span></div>}
          <div className="bottom-status"><span>Scene</span><span>·</span><span>Perspective</span><span className="status-spacer" /><span>WebGL</span><span>·</span><span>{notice}</span></div>
        </section>

        <aside className="panel right-panel">
          <div className="panel-heading"><span>INSPECTOR</span><button className="tiny-icon" title="Inspector options"><Settings2 size={15} /></button></div>
          <div className="inspector-tabs">
            <button className={inspectorTab === "object" ? "inspector-tab active" : "inspector-tab"} onClick={() => setInspectorTab("object")}><SlidersHorizontal size={14} /> Object</button>
            <button className={inspectorTab === "material" ? "inspector-tab active" : "inspector-tab"} onClick={() => setInspectorTab("material")}><Layers3 size={14} /> Material</button>
          </div>
          {selected ? <div className="inspector-content">
            <div className="object-title"><span className="object-icon"><Box size={17} /></span><div><strong>{selected.name}</strong><small>{selected.type}</small></div></div>
            {inspectorTab === "object" ? <>
              {(["position", "rotation", "scale"] as const).map((axis) => <div className="property-section" key={axis}>
                <div className="property-heading">{axis.toUpperCase()} <ChevronDown size={13} /></div>
                <div className="property-row"><span>{axis === "position" ? "Location" : axis === "rotation" ? "Rotation °" : "Scale"}</span><div className="property-values">{valuesFor(axis).map((value, index) => <input key={index} aria-label={`${axis} ${"XYZ"[index]}`} type="number" step={axis === "rotation" ? 1 : 0.1} value={Number(value.toFixed(3))} onChange={(event) => setValue(axis, index, event.target.value)} />)}</div></div>
              </div>)}
              <div className="property-section"><div className="property-heading">MESH DATA <ChevronDown size={13} /></div><div className="data-row"><span>Geometry</span><strong>{selected.type}</strong></div><div className="data-row"><span>Vertices</span><strong>{selected.vertices.toLocaleString()}</strong></div><div className="data-row"><span>Faces</span><strong>{selected.faces.toLocaleString()}</strong></div></div>
            </> : <>
              <div className="property-section">
                <div className="property-heading">BASE COLOR</div>
                <div className="material-control-row"><span>Color</span><input aria-label="Material base color" type="color" value={selected.materialColor.startsWith("#") ? selected.materialColor : "#ffffff"} onChange={(event) => setMaterialValue("color", event.target.value)} /></div>
              </div>
              {([
                ["metalness", "Metalness", selected.metalness],
                ["roughness", "Roughness", selected.roughness],
                ["opacity", "Opacity", selected.opacity],
              ] as const).map(([property, label, value]) => <div className="property-section" key={property}>
                <div className="material-range-heading"><span>{label}</span><strong>{value.toFixed(2)}</strong></div>
                <input className="material-range" aria-label={label} type="range" min="0" max="1" step="0.01" value={value} onChange={(event) => setMaterialValue(property, Number(event.target.value))} />
              </div>)}
              <p className="material-note">Changes apply directly to the selected mesh and are included in GLB export.</p>
            </>}
          </div> : <div className="empty-inspector">Select a mesh in the scene to inspect its properties.</div>}
          <div className="panel-foot inspector-foot"><Code2 size={13} /> Live scene properties</div>
        </aside>
      </section>
      <footer className="app-footer"><span>ULTRAGENGINE3D <b>0.2.0</b></span><span>Built for the browser</span><span><Upload size={12} /> GLB/glTF/OBJ Import · <Download size={12} /> GLB/OBJ Export</span></footer>
    </main>
  );
}
