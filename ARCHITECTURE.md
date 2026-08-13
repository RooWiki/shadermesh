# ShaderMesh Architecture

## Data Flow

```
MeshData (pure TypeScript, no Three.js)
    ↓  created by geometry generators
Editor Tools (position, normal, UV, color...)
    ↓  stored in
Zustand Store (sceneStore)
    ↓  synced to
SceneManager (Three.js scene)
    ↓  rendered by
Three.js WebGL Renderer
    ↓
Viewport Canvas
```

React components only read from the Zustand store. They never touch Three.js directly.
Three.js is a rendering layer — not the data model.

## Core Data Model

```typescript
interface MeshData {
  positions: Float32Array   // 3 floats / vertex
  normals?:  Float32Array   // 3 floats / vertex
  uvs?:      Float32Array   // 2 floats / vertex
  tangents?: Float32Array   // 4 floats / vertex (w = handedness)
  colors?:   Float32Array   // 4 floats / vertex (RGBA)
  indices:   Uint32Array    // 3 indices / triangle
}
```

All attribute data lives here. `SceneManager` converts it to `THREE.BufferGeometry`
via `meshDataToBufferGeometry()` in `MeshRenderer.ts`.

## Directory Structure

```
src/
├── core/
│   ├── MeshData.ts          Pure data interface + stats utilities
│   └── MeshObject.ts        Scene object: MeshData + Transform + metadata
│
├── geometry/
│   └── primitives/
│       ├── createPlane.ts   Subdivided plane generator
│       ├── createCube.ts    Per-face-normal cube generator
│       └── createSphere.ts  UV sphere generator
│
├── viewport/
│   ├── SceneManager.ts      Three.js scene, renderer, camera, controls
│   └── MeshRenderer.ts      MeshData → THREE.BufferGeometry converter
│
├── state/
│   └── sceneStore.ts        Zustand store: objects, selection, editor mode
│
└── components/
    ├── App.tsx              Layout: toolbar + panels + viewport
    ├── Viewport/            Three.js canvas wrapper (React)
    ├── Inspector/           Transform + MeshData panels
    ├── ObjectList/          Scene object list
    └── Toolbar/             Mode selector + Add Object
```

## Adding a New Tool

1. Create `src/tools/YourTool.ts` — operates on `MeshData` directly
2. Add state to `sceneStore.ts` if the tool has persistent mode/settings
3. If it needs a visual overlay, add it in `SceneManager.ts`
4. Add UI in `components/` that reads/writes via the store

The tool must not import Three.js unless it needs to compute something
viewport-specific (like raycasting). Keep math in pure TypeScript.

## Adding a New Attribute

1. Add the field to `MeshData` interface in `core/MeshData.ts`
2. Update `getMeshStats()` to report it
3. Update `meshDataToBufferGeometry()` in `MeshRenderer.ts` to upload it
4. Update primitive generators that should initialize it
5. Create a visualization tool that reads it for debug shaders

## SceneManager Lifecycle

```
constructor(container, onSelect, onTransform)
    → creates renderer, camera, lights, grid, controls
    → starts animation loop

syncObjects(objects, selectedId)
    → called every time Zustand objects/selectedId changes
    → adds missing meshes, removes deleted ones, updates transforms
    → updates selection highlight and TransformControls attachment

dispose()
    → cancels animation frame
    → removes event listeners
    → disposes all Three.js resources
    → removes canvas from DOM
```

## Selection Model

Raycasting happens inside `SceneManager`. When a mesh is clicked:
1. `SceneManager` calls `onSelect(id)` callback
2. Callback calls `useSceneStore.getState().selectObject(id)`
3. Store update triggers React re-render
4. `syncObjects` is called with new `selectedId`
5. `SceneManager.setSelection()` updates material + TransformControls

## Transform Sync

When the user drags a TransformControls gizmo:
1. Three.js moves the mesh directly (immediate visual feedback)
2. `objectChange` event fires → calls `onTransform(id, pos, rot, scale)`
3. Zustand store is updated
4. `syncObjects` re-applies the same position (idempotent, harmless)
