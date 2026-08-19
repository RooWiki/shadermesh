import type { MeshData } from '../core/MeshData'

export function deleteFaces(meshData: MeshData, faceIndices: number[]): MeshData {
  const { positions, normals, uvs, tangents, colors, indices } = meshData
  const deleteSet = new Set(faceIndices)
  const totalFaces = indices.length / 3
  const totalVerts = positions.length / 3

  // --- Step 1: Collect surviving indices ---
  const survivingIndices: number[] = []
  for (let f = 0; f < totalFaces; f++) {
    if (!deleteSet.has(f)) {
      survivingIndices.push(indices[f * 3], indices[f * 3 + 1], indices[f * 3 + 2])
    }
  }

  // --- Step 2: Mark which vertices are still referenced ---
  const used = new Uint8Array(totalVerts)
  for (const vi of survivingIndices) used[vi] = 1

  // --- Step 3: Build old→new vertex index remap ---
  const remap = new Int32Array(totalVerts).fill(-1)
  let newVertCount = 0
  for (let v = 0; v < totalVerts; v++) {
    if (used[v]) remap[v] = newVertCount++
  }

  // --- Step 4: Compact per-vertex attribute arrays ---
  const compactF32 = (src: Float32Array, stride: number): Float32Array => {
    const dst = new Float32Array(newVertCount * stride)
    for (let v = 0; v < totalVerts; v++) {
      if (remap[v] !== -1) {
        dst.set(src.subarray(v * stride, v * stride + stride), remap[v] * stride)
      }
    }
    return dst
  }

  // --- Step 5: Reindex surviving triangles ---
  const newIndices = new Uint32Array(survivingIndices.length)
  for (let i = 0; i < survivingIndices.length; i++) {
    newIndices[i] = remap[survivingIndices[i]]
  }

  return {
    positions: compactF32(positions, 3),
    normals:   undefined,                              // Recomputed by Three.js from new topology
    uvs:       uvs      ? compactF32(uvs, 2)      : undefined,
    tangents:  undefined,                              // Invalidated — depends on face topology
    colors:    colors   ? compactF32(colors, 4)   : undefined,
    indices:   newIndices,
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
