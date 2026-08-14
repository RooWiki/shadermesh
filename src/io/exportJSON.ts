import type { MeshData } from '../core/MeshData'

export function exportJSON(meshData: MeshData, name: string): string {
  return JSON.stringify({
    name,
    positions: Array.from(meshData.positions),
    normals:   meshData.normals   ? Array.from(meshData.normals)   : null,
    uvs:       meshData.uvs       ? Array.from(meshData.uvs)       : null,
    tangents:  meshData.tangents  ? Array.from(meshData.tangents)  : null,
    colors:    meshData.colors    ? Array.from(meshData.colors)    : null,
    indices:   Array.from(meshData.indices),
  }, null, 2)
}
