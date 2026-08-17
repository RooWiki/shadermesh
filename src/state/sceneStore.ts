import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { MeshObject, Transform, PrimitiveSource } from '../core/MeshObject'
import { createMeshObject } from '../core/MeshObject'
import type { UVMapConfig } from '../geometry/uvProjection'
import { projectUVs, projectUVsWithSeamFix, projectRadialUVsWithSeamFix, applyUVTransforms } from '../geometry/uvProjection'
import { createPlane, createCube, createSphere, createCylinder, createCone, createTorus, createCapsule, createShape2D } from '../geometry/primitives'
import type { CylinderParams, ConeParams, TorusParams, CapsuleParams, Shape2DType, Shape2DParams } from '../geometry/primitives'
import { recalculateFlatNormals, recalculateSmoothNormals } from '../geometry/normals'
import { flipFace } from '../geometry/faces'
import { calculateTangents } from '../geometry/tangents'

export type EditorMode = 'object' | 'vertex' | 'face'
export type WireframeMode = 'tri' | 'quad'
export type ActiveTool = 'select' | 'translate' | 'rotate' | 'scale'

const MAX_HISTORY = 50

let objectCounter = 0
function nextId(): string {
  return `obj_${++objectCounter}`
}

// Deep clone objects so TypedArrays in history are independent snapshots
function cloneObjects(objects: MeshObject[]): MeshObject[] {
  return objects.map(o => ({
    ...o,
    transform: { ...o.transform, position: [...o.transform.position] as [number,number,number], rotation: [...o.transform.rotation] as [number,number,number], scale: [...o.transform.scale] as [number,number,number] },
    meshData: {
      positions: new Float32Array(o.meshData.positions),
      normals:  o.meshData.normals  ? new Float32Array(o.meshData.normals)  : undefined,
      uvs:      o.meshData.uvs      ? new Float32Array(o.meshData.uvs)      : undefined,
      tangents: o.meshData.tangents ? new Float32Array(o.meshData.tangents) : undefined,
      colors:   o.meshData.colors   ? new Float32Array(o.meshData.colors)   : undefined,
      indices:  new Uint32Array(o.meshData.indices),
    },
    sourceParams: o.sourceParams ? { ...o.sourceParams } as PrimitiveSource : undefined,
    uvMap: o.uvMap ? { ...o.uvMap } : undefined,
  }))
}

function generateMeshFromSource(source: PrimitiveSource) {
  switch (source.kind) {
    case 'plane':    return createPlane(source.params)
    case 'cube':     return createCube(source.params)
    case 'sphere':   return createSphere(source.params)
    case 'cylinder': return createCylinder(source.params)
    case 'cone':     return createCone(source.params)
    case 'torus':    return createTorus(source.params)
    case 'capsule':  return createCapsule(source.params)
    case 'shape2d':  return createShape2D(source.shapeType, source.params)
  }
}

interface SceneState {
  objects: MeshObject[]
  selectedObjectId: string | null
  selectedVertexIndices: number[]
  selectedFaceIndices: number[]
  editorMode: EditorMode
  wireframeMode: WireframeMode
  gridVisible: boolean
  showNormals: boolean
  showTangents: boolean
  showVertexColors: boolean
  hoveredObjectId: string | null

  // History
  undoStack: MeshObject[][]
  redoStack: MeshObject[][]
  pushHistory: () => void
  undo: () => void
  redo: () => void

  // Object management
  addPlane: (params?: { width?: number; height?: number; subdivisionsX?: number; subdivisionsY?: number }) => string
  addCube: (params?: { width?: number; height?: number; depth?: number }) => string
  addSphere: (params?: { radius?: number; widthSegments?: number; heightSegments?: number }) => string
  addCylinder: (params?: CylinderParams) => string
  addCone: (params?: ConeParams) => string
  addTorus: (params?: TorusParams) => string
  addCapsule: (params?: CapsuleParams) => string
  addShape2D: (type: Shape2DType, params?: Shape2DParams) => string
  importObject: (meshData: import('../core/MeshData').MeshData, name: string) => string
  removeObject: (id: string) => void
  renameObject: (id: string, name: string) => void
  updatePrimitiveParams: (id: string, source: PrimitiveSource) => void
  applyUVProjection: (id: string, config: UVMapConfig) => void
  selectObject: (id: string | null) => void
  setHovered: (id: string | null) => void

  // Transform
  updateTransform: (id: string, transform: Partial<Transform>) => void
  updateTransformPosition: (id: string, position: [number, number, number]) => void
  updateTransformRotation: (id: string, rotation: [number, number, number]) => void
  updateTransformScale: (id: string, scale: [number, number, number]) => void

  // Vertex editing
  selectVertex: (index: number | null) => void
  selectVertices: (indices: number[]) => void
  updateVertexPosition: (objectId: string, index: number, position: [number, number, number]) => void
  updateVertexNormal: (objectId: string, index: number, normal: [number, number, number]) => void
  recalculateNormals: (objectId: string, type: 'flat' | 'smooth') => void

  // Face editing
  selectFace: (index: number | null) => void
  selectFaces: (indices: number[]) => void
  flipFaceNormal: (objectId: string, faceIndex: number) => void

  // Tangents
  computeTangents: (objectId: string) => void
  clearTangents: (objectId: string) => void

  // Vertex colors
  initVertexColors: (objectId: string, random?: boolean) => void
  clearVertexColors: (objectId: string) => void
  updateVertexColor: (objectId: string, index: number, color: [number, number, number, number]) => void

  // Mode / display / tool
  setEditorMode: (mode: EditorMode) => void
  setWireframeMode: (mode: WireframeMode) => void
  activeTool: ActiveTool
  setActiveTool: (tool: ActiveTool) => void
  setTransformSilent: (id: string, position: [number,number,number], rotation: [number,number,number], scale: [number,number,number]) => void
  toggleGrid: () => void
  toggleNormals: () => void
  toggleTangents: () => void
  toggleVertexColors: () => void
  showUVChecker: boolean
  toggleUVChecker: () => void

  // Notify viewport that mesh geometry changed without pushing history
  notifyMeshChanged: (objectId: string) => void

  // Utility
  getObject: (id: string) => MeshObject | undefined
  getSelectedObject: () => MeshObject | undefined
}

export const useSceneStore = create<SceneState>()(
  subscribeWithSelector((set, get) => ({
    objects: [],
    selectedObjectId: null,
    selectedVertexIndices: [],
    selectedFaceIndices: [],
    editorMode: 'object',
    wireframeMode: 'tri',
    gridVisible: true,
    showNormals: false,
    showTangents: false,
    showVertexColors: false,
    showUVChecker: false,
    hoveredObjectId: null,
    activeTool: 'select' as ActiveTool,
    undoStack: [],
    redoStack: [],

    pushHistory: () => {
      const { objects, undoStack } = get()
      const snapshot = cloneObjects(objects)
      set({
        undoStack: undoStack.length >= MAX_HISTORY
          ? [...undoStack.slice(1), snapshot]
          : [...undoStack, snapshot],
        redoStack: [],
      })
    },

    undo: () => {
      const { objects, undoStack, redoStack } = get()
      if (undoStack.length === 0) return
      const prev = undoStack[undoStack.length - 1]
      const current = cloneObjects(objects)
      set({
        objects: prev,
        undoStack: undoStack.slice(0, -1),
        redoStack: [...redoStack, current],
      })
    },

    redo: () => {
      const { objects, undoStack, redoStack } = get()
      if (redoStack.length === 0) return
      const next = redoStack[redoStack.length - 1]
      const current = cloneObjects(objects)
      set({
        objects: next,
        undoStack: [...undoStack, current],
        redoStack: redoStack.slice(0, -1),
      })
    },

    addPlane: (params = {}) => {
      get().pushHistory()
      const id = nextId()
      const name = `Plane.${String(objectCounter).padStart(3, '0')}`
      const source: PrimitiveSource = { kind: 'plane', params: { width: params.width ?? 1, height: params.height ?? 1, subdivisionsX: params.subdivisionsX ?? 1, subdivisionsY: params.subdivisionsY ?? 1 } }
      const obj = { ...createMeshObject(id, name, createPlane(source.params)), sourceParams: source }
      set(s => ({ objects: [...s.objects, obj], selectedObjectId: id }))
      return id
    },

    addCube: (params = {}) => {
      get().pushHistory()
      const id = nextId()
      const name = `Cube.${String(objectCounter).padStart(3, '0')}`
      const source: PrimitiveSource = { kind: 'cube', params: { width: params.width ?? 1, height: params.height ?? 1, depth: params.depth ?? 1 } }
      const obj = { ...createMeshObject(id, name, createCube(source.params)), sourceParams: source }
      set(s => ({ objects: [...s.objects, obj], selectedObjectId: id }))
      return id
    },

    addSphere: (params = {}) => {
      get().pushHistory()
      const id = nextId()
      const name = `Sphere.${String(objectCounter).padStart(3, '0')}`
      const source: PrimitiveSource = { kind: 'sphere', params: { radius: params.radius ?? 0.5, widthSegments: params.widthSegments ?? 32, heightSegments: params.heightSegments ?? 16 } }
      const obj = { ...createMeshObject(id, name, createSphere(source.params)), sourceParams: source }
      set(s => ({ objects: [...s.objects, obj], selectedObjectId: id }))
      return id
    },

    addCylinder: (params = {}) => {
      get().pushHistory()
      const id = nextId()
      const name = `Cylinder.${String(objectCounter).padStart(3, '0')}`
      const source: PrimitiveSource = { kind: 'cylinder', params: { radiusTop: params.radiusTop ?? 0.5, radiusBottom: params.radiusBottom ?? 0.5, height: params.height ?? 1, radialSegments: params.radialSegments ?? 16, heightSegments: params.heightSegments ?? 1, rise: params.rise ?? 0 } }
      const obj = { ...createMeshObject(id, name, createCylinder(source.params)), sourceParams: source }
      set(s => ({ objects: [...s.objects, obj], selectedObjectId: id }))
      return id
    },

    addCone: (params = {}) => {
      get().pushHistory()
      const id = nextId()
      const name = `Cone.${String(objectCounter).padStart(3, '0')}`
      const source: PrimitiveSource = { kind: 'cone', params: { radius: params.radius ?? 0.5, height: params.height ?? 1, radialSegments: params.radialSegments ?? 16, rise: params.rise ?? 0 } }
      const obj = { ...createMeshObject(id, name, createCone(source.params)), sourceParams: source }
      set(s => ({ objects: [...s.objects, obj], selectedObjectId: id }))
      return id
    },

    addTorus: (params = {}) => {
      get().pushHistory()
      const id = nextId()
      const name = `Torus.${String(objectCounter).padStart(3, '0')}`
      const source: PrimitiveSource = { kind: 'torus', params: { radius: params.radius ?? 0.5, tube: params.tube ?? 0.2, radialSegments: params.radialSegments ?? 12, tubularSegments: params.tubularSegments ?? 32, rise: params.rise ?? 0 } }
      const obj = { ...createMeshObject(id, name, createTorus(source.params)), sourceParams: source }
      set(s => ({ objects: [...s.objects, obj], selectedObjectId: id }))
      return id
    },

    addCapsule: (params = {}) => {
      get().pushHistory()
      const id = nextId()
      const name = `Capsule.${String(objectCounter).padStart(3, '0')}`
      const source: PrimitiveSource = { kind: 'capsule', params: { radius: params.radius ?? 0.4, height: params.height ?? 1, radialSegments: params.radialSegments ?? 16, hemisphereSegments: params.hemisphereSegments ?? 8 } }
      const obj = { ...createMeshObject(id, name, createCapsule(source.params)), sourceParams: source }
      set(s => ({ objects: [...s.objects, obj], selectedObjectId: id }))
      return id
    },

    addShape2D: (type, params = {}) => {
      get().pushHistory()
      const id = nextId()
      const label = type.charAt(0).toUpperCase() + type.slice(1)
      const name = `${label}.${String(objectCounter).padStart(3, '0')}`
      const source: PrimitiveSource = { kind: 'shape2d', shapeType: type, params: { ...params } }
      const obj = { ...createMeshObject(id, name, createShape2D(type, params)), sourceParams: source }
      set(s => ({ objects: [...s.objects, obj], selectedObjectId: id }))
      return id
    },

    importObject: (meshData, name) => {
      get().pushHistory()
      const id = nextId()
      const obj = createMeshObject(id, name, meshData)
      set(s => ({ objects: [...s.objects, obj], selectedObjectId: id }))
      return id
    },

    removeObject: (id) => {
      get().pushHistory()
      set(s => ({
        objects: s.objects.filter(o => o.id !== id),
        selectedObjectId: s.selectedObjectId === id ? null : s.selectedObjectId,
      }))
    },

    renameObject: (id, name) => {
      const trimmed = name.trim()
      if (!trimmed) return
      set(s => ({ objects: s.objects.map(o => o.id === id ? { ...o, name: trimmed } : o) }))
    },

    updatePrimitiveParams: (id, source) => {
      get().pushHistory()
      const meshData = generateMeshFromSource(source)
      set(s => ({
        objects: s.objects.map(o => o.id !== id ? o : { ...o, meshData, sourceParams: source }),
      }))
    },

    applyUVProjection: (id, config) => {
      get().pushHistory()
      set(s => ({
        objects: s.objects.map(o => {
          if (o.id !== id) return o

          if (config.projection === 'shape_default') {
            const baseUVs = o.sourceParams ? generateMeshFromSource(o.sourceParams).uvs : o.meshData.uvs
            if (!baseUVs) return { ...o, uvMap: config }
            return { ...o, meshData: { ...o.meshData, uvs: applyUVTransforms(baseUVs, config) }, uvMap: config }
          }

          if (config.projection === 'radial' || config.projection === 'cylindrical' || config.projection === 'spherical') {
            // Always use fresh base mesh to avoid accumulating seam-fix vertices across calls
            const baseMesh = o.sourceParams ? generateMeshFromSource(o.sourceParams) : o.meshData
            const r = config.projection === 'radial'
              ? projectRadialUVsWithSeamFix(baseMesh.positions, baseMesh.normals, baseMesh.indices)
              : projectUVsWithSeamFix(baseMesh.positions, baseMesh.normals, baseMesh.indices, config.projection)
            // Extend tangents/colors for duplicated vertices
            const extendAttr = (arr: Float32Array | undefined, stride: number) => {
              if (!arr) return undefined
              const ext = new Float32Array(arr.length + r.extraVertexSources.length * stride)
              ext.set(arr)
              r.extraVertexSources.forEach((src, i) =>
                ext.set(arr.subarray(src * stride, src * stride + stride), arr.length + i * stride))
              return ext
            }
            return {
              ...o,
              meshData: {
                positions: r.positions,
                normals: r.normals,
                uvs: applyUVTransforms(r.uvs, config),
                indices: r.indices,
                tangents: extendAttr(baseMesh.tangents, 4),
                colors: extendAttr(baseMesh.colors, 4),
              },
              uvMap: config,
            }
          }

          const baseUVs = projectUVs(o.meshData.positions, o.meshData.normals, config.projection)
          return { ...o, meshData: { ...o.meshData, uvs: applyUVTransforms(baseUVs, config) }, uvMap: config }
        }),
      }))
    },

    selectObject: (id) => set({ selectedObjectId: id, selectedVertexIndices: [], selectedFaceIndices: [] }),
    setHovered: (id) => set({ hoveredObjectId: id }),

    selectVertex: (index) => set({ selectedVertexIndices: index !== null ? [index] : [] }),
    selectVertices: (indices) => set({ selectedVertexIndices: indices }),

    selectFace: (index) => set({ selectedFaceIndices: index !== null ? [index] : [] }),
    selectFaces: (indices) => set({ selectedFaceIndices: indices }),

    flipFaceNormal: (objectId, faceIndex) => {
      get().pushHistory()
      set(s => ({
        objects: s.objects.map(o => {
          if (o.id !== objectId) return o
          return { ...o, meshData: flipFace(o.meshData, faceIndex) }
        }),
      }))
    },

    updateVertexPosition: (objectId, index, position) => {
      get().pushHistory()
      set(s => ({
        objects: s.objects.map(o => {
          if (o.id !== objectId) return o
          const positions = o.meshData.positions
          positions[index * 3] = position[0]
          positions[index * 3 + 1] = position[1]
          positions[index * 3 + 2] = position[2]
          return { ...o, meshData: { ...o.meshData } }
        }),
      }))
    },

    updateVertexNormal: (objectId, index, normal) => {
      get().pushHistory()
      set(s => ({
        objects: s.objects.map(o => {
          if (o.id !== objectId || !o.meshData.normals) return o
          const normals = o.meshData.normals
          normals[index * 3] = normal[0]
          normals[index * 3 + 1] = normal[1]
          normals[index * 3 + 2] = normal[2]
          return { ...o, meshData: { ...o.meshData } }
        }),
      }))
    },

    recalculateNormals: (objectId, type) => {
      get().pushHistory()
      set(s => ({
        objects: s.objects.map(o => {
          if (o.id !== objectId) return o
          const fn = type === 'flat' ? recalculateFlatNormals : recalculateSmoothNormals
          return { ...o, meshData: fn(o.meshData) }
        }),
      }))
    },

    updateTransform: (id, transform) => {
      get().pushHistory()
      set(s => ({
        objects: s.objects.map(o =>
          o.id === id ? { ...o, transform: { ...o.transform, ...transform } } : o
        ),
      }))
    },

    updateTransformPosition: (id, position) => {
      get().pushHistory()
      set(s => ({
        objects: s.objects.map(o =>
          o.id === id ? { ...o, transform: { ...o.transform, position } } : o
        ),
      }))
    },

    updateTransformRotation: (id, rotation) => {
      get().pushHistory()
      set(s => ({
        objects: s.objects.map(o =>
          o.id === id ? { ...o, transform: { ...o.transform, rotation } } : o
        ),
      }))
    },

    updateTransformScale: (id, scale) => {
      get().pushHistory()
      set(s => ({
        objects: s.objects.map(o =>
          o.id === id ? { ...o, transform: { ...o.transform, scale } } : o
        ),
      }))
    },

    initVertexColors: (objectId, random = false) => {
      get().pushHistory()
      set(s => ({
        objects: s.objects.map(o => {
          if (o.id !== objectId) return o
          const count = o.meshData.positions.length / 3
          const colors = new Float32Array(count * 4)
          if (random) {
            for (let i = 0; i < count; i++) {
              colors[i*4]   = Math.random()
              colors[i*4+1] = Math.random()
              colors[i*4+2] = Math.random()
              colors[i*4+3] = 1
            }
          } else {
            colors.fill(1)
          }
          return { ...o, meshData: { ...o.meshData, colors } }
        }),
      }))
    },

    clearVertexColors: (objectId) => {
      get().pushHistory()
      set(s => ({
        objects: s.objects.map(o =>
          o.id !== objectId ? o : { ...o, meshData: { ...o.meshData, colors: undefined } }
        ),
      }))
    },

    updateVertexColor: (objectId, index, color) => {
      get().pushHistory()
      set(s => ({
        objects: s.objects.map(o => {
          if (o.id !== objectId || !o.meshData.colors) return o
          const colors = o.meshData.colors
          colors[index*4]   = color[0]
          colors[index*4+1] = color[1]
          colors[index*4+2] = color[2]
          colors[index*4+3] = color[3]
          return { ...o, meshData: { ...o.meshData } }
        }),
      }))
    },

    setEditorMode: (mode) => set({ editorMode: mode, selectedVertexIndices: [], selectedFaceIndices: [] }),
    setWireframeMode: (mode) => set({ wireframeMode: mode }),
    setActiveTool: (tool) => set({ activeTool: tool }),
    setTransformSilent: (id, position, rotation, scale) => {
      set(s => ({
        objects: s.objects.map(o =>
          o.id === id ? { ...o, transform: { position, rotation, scale } } : o
        ),
      }))
    },

    computeTangents: (objectId) => {
      get().pushHistory()
      set(s => ({
        objects: s.objects.map(o =>
          o.id !== objectId ? o : { ...o, meshData: calculateTangents(o.meshData) }
        ),
      }))
    },

    clearTangents: (objectId) => {
      get().pushHistory()
      set(s => ({
        objects: s.objects.map(o =>
          o.id !== objectId ? o : { ...o, meshData: { ...o.meshData, tangents: undefined } }
        ),
      }))
    },

    toggleGrid: () => set(s => ({ gridVisible: !s.gridVisible })),
    toggleNormals: () => set(s => ({ showNormals: !s.showNormals })),
    toggleTangents: () => set(s => ({ showTangents: !s.showTangents })),
    toggleVertexColors: () => set(s => ({ showVertexColors: !s.showVertexColors })),
    toggleUVChecker: () => set(s => ({ showUVChecker: !s.showUVChecker })),

    notifyMeshChanged: (objectId) => {
      set(s => ({
        objects: s.objects.map(o =>
          o.id !== objectId ? o : { ...o, meshData: { ...o.meshData } }
        ),
      }))
    },

    getObject: (id) => get().objects.find(o => o.id === id),
    getSelectedObject: () => {
      const { objects, selectedObjectId } = get()
      return selectedObjectId ? objects.find(o => o.id === selectedObjectId) : undefined
    },
  }))
)
