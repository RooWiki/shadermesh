import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { MeshObject, Transform } from '../core/MeshObject'
import { createMeshObject } from '../core/MeshObject'
import { createPlane, createCube, createSphere } from '../geometry/primitives'
import { recalculateFlatNormals, recalculateSmoothNormals } from '../geometry/normals'
import { flipFace } from '../geometry/faces'

export type EditorMode = 'object' | 'vertex' | 'face'
export type WireframeMode = 'tri' | 'quad'

let objectCounter = 0
function nextId(): string {
  return `obj_${++objectCounter}`
}

interface SceneState {
  objects: MeshObject[]
  selectedObjectId: string | null
  selectedVertexIndex: number | null
  selectedFaceIndex: number | null
  editorMode: EditorMode
  wireframeMode: WireframeMode
  gridVisible: boolean
  showNormals: boolean
  hoveredObjectId: string | null

  // Object management
  addPlane: (params?: { width?: number; height?: number; subdivisionsX?: number; subdivisionsY?: number }) => string
  addCube: (params?: { width?: number; height?: number; depth?: number }) => string
  addSphere: (params?: { radius?: number; widthSegments?: number; heightSegments?: number }) => string
  removeObject: (id: string) => void
  selectObject: (id: string | null) => void
  setHovered: (id: string | null) => void

  // Transform
  updateTransform: (id: string, transform: Partial<Transform>) => void
  updateTransformPosition: (id: string, position: [number, number, number]) => void
  updateTransformRotation: (id: string, rotation: [number, number, number]) => void
  updateTransformScale: (id: string, scale: [number, number, number]) => void

  // Vertex editing
  selectVertex: (index: number | null) => void
  updateVertexPosition: (objectId: string, index: number, position: [number, number, number]) => void
  updateVertexNormal: (objectId: string, index: number, normal: [number, number, number]) => void
  recalculateNormals: (objectId: string, type: 'flat' | 'smooth') => void

  // Face editing
  selectFace: (index: number | null) => void
  flipFaceNormal: (objectId: string, faceIndex: number) => void

  // Mode / display
  setEditorMode: (mode: EditorMode) => void
  setWireframeMode: (mode: WireframeMode) => void
  toggleGrid: () => void
  toggleNormals: () => void

  // Utility
  getObject: (id: string) => MeshObject | undefined
  getSelectedObject: () => MeshObject | undefined
}

export const useSceneStore = create<SceneState>()(
  subscribeWithSelector((set, get) => ({
    objects: [],
    selectedObjectId: null,
    selectedVertexIndex: null,
    selectedFaceIndex: null,
    editorMode: 'object',
    wireframeMode: 'tri',
    gridVisible: true,
    showNormals: false,
    hoveredObjectId: null,

    addPlane: (params = {}) => {
      const id = nextId()
      const name = `Plane.${String(objectCounter).padStart(3, '0')}`
      const meshData = createPlane(params)
      const obj = createMeshObject(id, name, meshData)
      set(s => ({ objects: [...s.objects, obj], selectedObjectId: id }))
      return id
    },

    addCube: (params = {}) => {
      const id = nextId()
      const name = `Cube.${String(objectCounter).padStart(3, '0')}`
      const meshData = createCube(params)
      const obj = createMeshObject(id, name, meshData)
      set(s => ({ objects: [...s.objects, obj], selectedObjectId: id }))
      return id
    },

    addSphere: (params = {}) => {
      const id = nextId()
      const name = `Sphere.${String(objectCounter).padStart(3, '0')}`
      const meshData = createSphere(params)
      const obj = createMeshObject(id, name, meshData)
      set(s => ({ objects: [...s.objects, obj], selectedObjectId: id }))
      return id
    },

    removeObject: (id) => {
      set(s => ({
        objects: s.objects.filter(o => o.id !== id),
        selectedObjectId: s.selectedObjectId === id ? null : s.selectedObjectId,
      }))
    },

    selectObject: (id) => set({ selectedObjectId: id, selectedVertexIndex: null, selectedFaceIndex: null }),
    setHovered: (id) => set({ hoveredObjectId: id }),

    selectVertex: (index) => set({ selectedVertexIndex: index }),

    selectFace: (index) => set({ selectedFaceIndex: index }),

    flipFaceNormal: (objectId, faceIndex) => {
      set(s => ({
        objects: s.objects.map(o => {
          if (o.id !== objectId) return o
          return { ...o, meshData: flipFace(o.meshData, faceIndex) }
        }),
      }))
    },

    updateVertexPosition: (objectId, index, position) => {
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
      set(s => ({
        objects: s.objects.map(o => {
          if (o.id !== objectId) return o
          const fn = type === 'flat' ? recalculateFlatNormals : recalculateSmoothNormals
          return { ...o, meshData: fn(o.meshData) }
        }),
      }))
    },

    updateTransform: (id, transform) => {
      set(s => ({
        objects: s.objects.map(o =>
          o.id === id ? { ...o, transform: { ...o.transform, ...transform } } : o
        ),
      }))
    },

    updateTransformPosition: (id, position) => {
      set(s => ({
        objects: s.objects.map(o =>
          o.id === id ? { ...o, transform: { ...o.transform, position } } : o
        ),
      }))
    },

    updateTransformRotation: (id, rotation) => {
      set(s => ({
        objects: s.objects.map(o =>
          o.id === id ? { ...o, transform: { ...o.transform, rotation } } : o
        ),
      }))
    },

    updateTransformScale: (id, scale) => {
      set(s => ({
        objects: s.objects.map(o =>
          o.id === id ? { ...o, transform: { ...o.transform, scale } } : o
        ),
      }))
    },

    setEditorMode: (mode) => set({ editorMode: mode, selectedVertexIndex: null, selectedFaceIndex: null }),
    setWireframeMode: (mode) => set({ wireframeMode: mode }),
    toggleGrid: () => set(s => ({ gridVisible: !s.gridVisible })),
    toggleNormals: () => set(s => ({ showNormals: !s.showNormals })),

    getObject: (id) => get().objects.find(o => o.id === id),
    getSelectedObject: () => {
      const { objects, selectedObjectId } = get()
      return selectedObjectId ? objects.find(o => o.id === selectedObjectId) : undefined
    },
  }))
)
