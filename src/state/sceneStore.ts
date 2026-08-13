import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { MeshObject, Transform } from '../core/MeshObject'
import { createMeshObject } from '../core/MeshObject'
import { createPlane, createCube, createSphere } from '../geometry/primitives'

export type EditorMode = 'object' | 'vertex' | 'face'

let objectCounter = 0
function nextId(): string {
  return `obj_${++objectCounter}`
}

interface SceneState {
  objects: MeshObject[]
  selectedObjectId: string | null
  editorMode: EditorMode
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

  // Mode
  setEditorMode: (mode: EditorMode) => void

  // Utility
  getObject: (id: string) => MeshObject | undefined
  getSelectedObject: () => MeshObject | undefined
}

export const useSceneStore = create<SceneState>()(
  subscribeWithSelector((set, get) => ({
    objects: [],
    selectedObjectId: null,
    editorMode: 'object',
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

    selectObject: (id) => set({ selectedObjectId: id }),
    setHovered: (id) => set({ hoveredObjectId: id }),

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

    setEditorMode: (mode) => set({ editorMode: mode }),

    getObject: (id) => get().objects.find(o => o.id === id),
    getSelectedObject: () => {
      const { objects, selectedObjectId } = get()
      return selectedObjectId ? objects.find(o => o.id === selectedObjectId) : undefined
    },
  }))
)
