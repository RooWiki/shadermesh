import type { MeshData } from '../core/MeshData'

export function flipFace(meshData: MeshData, faceIndex: number): MeshData {
  const indices = new Uint32Array(meshData.indices)
  const b = indices[faceIndex * 3 + 1]
  const c = indices[faceIndex * 3 + 2]
  indices[faceIndex * 3 + 1] = c
  indices[faceIndex * 3 + 2] = b
  return { ...meshData, indices }
}

export function flipFaces(meshData: MeshData, faceIndices: number[]): MeshData {
  const indices = new Uint32Array(meshData.indices)
  for (const fi of faceIndices) {
    const b = indices[fi * 3 + 1]
    const c = indices[fi * 3 + 2]
    indices[fi * 3 + 1] = c
    indices[fi * 3 + 2] = b
  }
  return { ...meshData, indices }
}
