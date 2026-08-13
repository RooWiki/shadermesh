
# ShaderMesh

A desktop tool for Technical Artists to inspect and edit 3D mesh data before applying shaders.

## What is ShaderMesh?

ShaderMesh makes the relationship between mesh data and shaders visible and editable:
<img width="1196" height="927" alt="2026-08-13_17-13-34" src="https://github.com/user-attachments/assets/6d6d4dba-2910-4654-aaa9-c96fd091e57a" />
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

## Installation

```bash
git clone <repo>
cd shadermesh
npm install
```

## Development

```bash
npm run dev
```

Open `http://localhost:5173`

## Build

```bash
npm run build
```

## Tests

```bash
npm run test         # run once
npm run test:watch   # watch mode
```

## Controls

| Key | Action |
|-----|--------|
| `G` | Move (translate) |
| `R` | Rotate |
| `S` | Scale |
| `F` | Frame selected object |
| `1` | Object Mode |
| `2` | Vertex Mode (FASE 2) |
| `3` | Face Mode (FASE 4) |
| `Ctrl+Z` | Undo (FASE 6) |
| `Ctrl+Shift+Z` | Redo (FASE 6) |
| Mouse drag | Orbit camera |
| Middle drag / Shift+drag | Pan |
| Scroll | Zoom |

## Phase Status

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | ✓ Done | Viewport, camera, primitives, selection, transform |
| 2 | Planned | Vertex mode, vertex selection, position editing |
| 3 | Planned | Normals, UV visualization, UV editor |
| 4 | Planned | Tangents, vertex colors, topology mode |
| 5 | Planned | Attribute Visualizer, debug shaders |
| 6 | Planned | Import/Export, project files, undo/redo |
