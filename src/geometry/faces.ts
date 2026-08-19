import type { MeshData } from '../core/MeshData'

export function deleteFaces(meshData: MeshData, faceIndices: number[]): MeshData {
  const deleteSet = new Set(faceIndices)
  const totalFaces = meshData.indices.length / 3
  let keepCount = 0
  for (let f = 0; f < totalFaces; f++) {
    if (!deleteSet.has(f)) keepCount++
  }
  const newIndices = new Uint32Array(keepCount * 3)
  let out = 0
  for (let f = 0; f < totalFaces; f++) {
    if (!deleteSet.has(f)) {
      newIndices[out++] = meshData.indices[f * 3 + 0]
      newIndices[out++] = meshData.indices[f * 3 + 1]
      newIndices[out++] = meshData.indices[f * 3 + 2]
    }
  }
  return {
    ...meshData,
    indices: newIndices,
    normals: undefined,  // Recomputed by Three.js from new topology
    tangents: undefined, // Invalidated — tangents depend on face topology
  }
}

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
