import type { MeshData } from './MeshData'

export interface Transform {
  position: [number, number, number]
  rotation: [number, number, number] // Euler angles in radians
  scale: [number, number, number]
}

export interface MeshObject {
  id: string
  name: string
  meshData: MeshData
  transform: Transform
  visible: boolean
}

export function defaultTransform(): Transform {
  return {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
  }
}

export function createMeshObject(
  id: string,
  name: string,
  meshData: MeshData,
  transform?: Partial<Transform>,
): MeshObject {
  return {
    id,
    name,
    meshData,
    transform: { ...defaultTransform(), ...transform },
    visible: true,
  }
}
