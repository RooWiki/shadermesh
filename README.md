# ShaderMesh

A browser-based mesh editor for Technical Artists to inspect and edit 3D mesh data before applying shaders.

<img width="1196" height="927" alt="ShaderMesh editor" src="https://github.com/user-attachments/assets/6d6d4dba-2910-4654-aaa9-c96fd091e57a" />

## What is ShaderMesh?

ShaderMesh makes the relationship between mesh data and shaders visible and editable:

```
MESH
│
├── Position      → where vertices sit in space
├── Normal        → surface direction (lighting)
├── UV            → texture coordinates
├── Tangent       → normal map basis
├── Vertex Color  → per-vertex masks / data
└── Topology      → how triangles connect
        ↓
      SHADER
        ↓
   FINAL VISUAL
```

It is not a replacement for Blender or Maya. It is a focused editor for understanding and manipulating the data that shaders consume.

## Stack

- **React 19** + TypeScript + Vite
- **Three.js v0.185** — rendering only, not the data model
- **Zustand v5** — global state with subscribeWithSelector
- MeshData lives in pure TypeScript Float32Arrays; Three.js only gets them at render time

## Features

### Viewport

- 4-camera quad view (Top, Front, Right, Perspective)
- Double-click a panel label to maximize / restore it
- Orbit, pan, zoom per viewport
- Wireframe toggle, grid toggle
- Resizable left and right panels

### Edit Modes

| Mode | Key | What you can do |
|------|-----|-----------------|
| Object | `1` | Select, transform, rename, delete objects |
| Vertex | `2` | Select vertices, inspect/edit positions, apply sub-object transforms |
| Face   | `3` | Select faces, inspect face data |

### Tools

| Key | Tool |
|-----|------|
| `Q` | Select |
| `W` | Translate (gizmo) |
| `E` | Rotate (gizmo) |
| `R` | Scale (gizmo) |

Shift+click adds to / removes from the selection. Alt+drag orbits without deselecting.

### Primitives

**3D** — 7 primitives with configurable parameters and a live preview:

| Primitive | Parameters |
|-----------|-----------|
| Plane | Width, Height, Subdivisions X/Y |
| Cube | Width, Height, Depth |
| Sphere | Radius, Width Segments, Height Segments |
| Cylinder | Radius Top/Bottom, Height, Radial/Height Segments, Rise/Rev |
| Cone | Radius, Height, Radial Segments, Rise/Rev |
| Torus | Radius, Tube, Radial/Tubular Segments, Rise/Rev |
| Capsule | Radius, Height, Radial/Hemisphere Segments |

**2D** — 36 flat mesh shapes in 6 categories:

| Category | Shapes |
|----------|--------|
| Curved | Circle, Ellipse, Oval, Semicircle, Arc, Ring, Sector, Segment, Crown, Crescent, Spiral |
| Triangles | Triangle, Equilateral, Isosceles, Scalene, Elongated |
| Quads | Rectangle, Square, Rhombus, Rhomboid, Trapezoid, Parallelogram, Kite |
| Regular | Pentagon, Hexagon, Heptagon, Octagon, Irregular |
| Decorative | Star, Arrow, Wedge, Ribbon |
| Lines | Straight, Curved, Broken, Zigzag |

### Attribute Visualization

- **Normals** — visualize surface normals as line overlays
- **Tangents** — tangent space basis vectors (tangent + bitangent), computed from UVs
- **Vertex Colors** — display per-vertex RGBA colors in the viewport; edit per-vertex in the Inspector

### Inspector

- Transform panel: position, rotation, scale with drag-scrub numeric inputs
- Mesh data panel: vertex count, triangle count, attribute summary
- Vertex panel: position and color per selected vertex
- Face panel: indices and winding per selected face
- UV Viewer: 2D UV layout of the selected mesh

### Import / Export

- **OBJ** — import and export standard Wavefront OBJ
- **JSON** — ShaderMesh native format (preserves all attributes including tangents and vertex colors)

### Undo / Redo

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |

### Other Shortcuts

| Key | Action |
|-----|--------|
| `Delete` / `Backspace` | Delete selected object |
| `Escape` | Deselect |

## Getting Started

```bash
git clone https://github.com/RooWiki/shadermesh.git
cd shadermesh
npm install
npm run dev
```

Open `http://localhost:5173`.

## Build

```bash
npm run build
```

## Tests

```bash
npm run test         # run once
npm run test:watch   # watch mode
```

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for the data flow, core data model, and guidelines for adding new tools or attributes.

The short version: `MeshData` is a plain TypeScript struct of `Float32Array`s. `SceneManager` converts it to `THREE.BufferGeometry` at render time. React components only read from the Zustand store — they never touch Three.js directly.

## License

MIT
