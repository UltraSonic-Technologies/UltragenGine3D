import { useCallback, useState } from "react";
import {
  Box, ChevronDown, CircleHelp, Cloud, Code2, Download, Eye,
  FilePlus2, FolderOpen, Grid2X2, Image, Layers3, Lightbulb,
  Maximize2, MousePointer2, Move3D, Rotate3D, Save, Settings2,
  Shapes, SlidersHorizontal, Sparkles, Upload,
} from "lucide-react";
import Viewport from "./engine/Viewport";

type Workspace = "engine" | "generator" | "retexture" | "editor";

const workspaceLabels: Record<Workspace, string> = {
  engine: "Ultragen Engine",
  generator: "AI Generator",
  retexture: "AI Retexture",
  editor: "Model Editor",
};

export default function App() {
  const [workspace, setWorkspace] = useState<Workspace>("engine");
  const [selected, setSelected] = useState("Sample Model");
  const [tool, setTool] = useState("select");
  const [showGrid, setShowGrid] = useState(true);

  const chooseWorkspace = useCallback((next: Workspace) => {
    setWorkspace(next);
  }, []);

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="UltragenGine3D home">
          <span className="brand-mark"><Shapes size={20} /></span>
          <span>ultragen<span className="brand-accent">gine</span>3d</span>
          <span className="version">0.1.0</span>
        </a>
        <div className="project-name"><span className="status-dot" /> Untitled Project <ChevronDown size={14} /></div>
        <div className="top-actions">
          <button className="icon-button" title="Open project"><FolderOpen size={17} /></button>
          <button className="icon-button" title="Save project"><Save size={17} /></button>
          <button className="button button-muted"><Cloud size={15} /> Local project</button>
          <button className="button button-primary"><Download size={15} /> Export</button>
          <button className="icon-button" title="Settings"><Settings2 size={17} /></button>
        </div>
      </header>

      <nav className="workspace-nav" aria-label="Workspace">
        <button className={workspace === "engine" ? "nav-item active" : "nav-item"} onClick={() => chooseWorkspace("engine")}><Box size={16} /> Engine</button>
        <button className={workspace === "generator" ? "nav-item active" : "nav-item"} onClick={() => chooseWorkspace("generator")}><Sparkles size={16} /> AI Generator <span className="soon">planned</span></button>
        <button className={workspace === "retexture" ? "nav-item active" : "nav-item"} onClick={() => chooseWorkspace("retexture")}><Image size={16} /> Retexture <span className="soon">planned</span></button>
        <button className={workspace === "editor" ? "nav-item active" : "nav-item"} onClick={() => chooseWorkspace("editor")}><Move3D size={16} /> Model Editor <span className="soon">planned</span></button>
        <div className="nav-spacer" />
        <span className="nav-caption">BROWSER WORKSPACE</span>
      </nav>

      <section className="editor-layout">
        <aside className="panel left-panel">
          <div className="panel-heading"><span>SCENE</span><div><button className="tiny-icon" title="Add object"><FilePlus2 size={15} /></button><button className="tiny-icon" title="Scene options"><SlidersHorizontal size={15} /></button></div></div>
          <div className="scene-search"><Grid2X2 size={14} /><span>Scene collection</span><ChevronDown size={13} /></div>
          <div className="tree-list">
            <button className="tree-row"><ChevronDown size={13} /><Layers3 size={15} /><span>Scene</span></button>
            <button className="tree-row indent"><ChevronDown size={13} /><Lightbulb size={14} /><span>Lighting</span></button>
            <button className={selected === "Sample Model" ? "tree-row indent selected" : "tree-row indent"} onClick={() => setSelected("Sample Model")}><Box size={14} /><span>Sample Model</span><Eye size={13} className="tree-eye" /></button>
            <button className="tree-row indent"><Grid2X2 size={14} /><span>Ground</span><Eye size={13} className="tree-eye" /></button>
          </div>
          <div className="panel-foot"><span className="mini-dot" /> 4 objects in scene</div>
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
            <div className="viewport-spacer" />
            <span className="viewport-mode">PERSPECTIVE <ChevronDown size={12} /></span>
            <button className="tool-button" title="Viewport help"><CircleHelp size={16} /></button>
          </div>
          {workspace === "engine" ? (
            <div className="viewport-wrap">
              <Viewport showGrid={showGrid} />
              <div className="viewport-label"><span className="live-dot" /> REAL-TIME VIEWPORT</div>
              <div className="axis-widget"><span className="axis-y">Y</span><span className="axis-x">X</span><span className="axis-z">Z</span><span className="axis-center" /></div>
              <div className="viewport-hint">Orbit: drag · Zoom: scroll · Pan: right-drag</div>
            </div>
          ) : (
            <div className="planned-workspace">
              <div className="planned-icon">{workspace === "generator" ? <Sparkles size={28} /> : workspace === "retexture" ? <Image size={28} /> : <Move3D size={28} />}</div>
              <h2>{workspaceLabels[workspace]}</h2>
              <p>This module is on the UltragenGine3D roadmap. The 3D Engine workspace is the first active implementation.</p>
              <span className="planned-tag">PLANNED MODULE</span>
            </div>
          )}
          <div className="bottom-status"><span>Scene</span><span>·</span><span>Perspective</span><span className="status-spacer" /><span>WebGL</span><span>·</span><span>Ready</span></div>
        </section>

        <aside className="panel right-panel">
          <div className="panel-heading"><span>INSPECTOR</span><button className="tiny-icon" title="Inspector options"><Settings2 size={15} /></button></div>
          <div className="inspector-tabs"><button className="inspector-tab active"><SlidersHorizontal size={14} /> Object</button><button className="inspector-tab"><Layers3 size={14} /> Material</button></div>
          <div className="inspector-content">
            <div className="object-title"><span className="object-icon"><Box size={17} /></span><div><strong>{selected}</strong><small>Mesh object</small></div></div>
            <div className="property-section">
              <div className="property-heading">TRANSFORM <ChevronDown size={13} /></div>
              {["Location", "Rotation", "Scale"].map((label) => (
                <div className="property-row" key={label}><span>{label}</span><div className="property-values"><span>{label === "Scale" ? "1.00" : "0.00"}</span><span>{label === "Scale" ? "1.00" : "0.00"}</span><span>{label === "Scale" ? "1.00" : "0.00"}</span></div></div>
              ))}
            </div>
            <div className="property-section">
              <div className="property-heading">MESH DATA <ChevronDown size={13} /></div>
              <div className="data-row"><span>Geometry</span><strong>Torus Knot</strong></div>
              <div className="data-row"><span>Vertices</span><strong>3,840</strong></div>
              <div className="data-row"><span>Faces</span><strong>1,920</strong></div>
            </div>
            <div className="property-section">
              <div className="property-heading">MATERIAL <ChevronDown size={13} /></div>
              <div className="material-preview"><span className="material-swatch" /><div><strong>Ultragen Blue</strong><small>Standard · PBR</small></div><button className="tiny-icon"><Settings2 size={14} /></button></div>
            </div>
          </div>
          <div className="panel-foot inspector-foot"><Code2 size={13} /> Properties are read-only in this build</div>
        </aside>
      </section>
      <footer className="app-footer"><span>ULTRAGENGINE3D <b>0.1.0</b></span><span>Built for the browser</span><span><Upload size={12} /> Import · <Download size={12} /> Export</span></footer>
    </main>
  );
}
