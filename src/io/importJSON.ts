import type { MeshData } from '../core/MeshData'

export function importJSON(content: string): { name: string; meshData: MeshData } {
  const d = JSON.parse(content)
  return {
    name: typeof d.name === 'string' ? d.name : 'Imported',
    meshData: {
      positions: new Float32Array(d.positions),
      normals:   d.normals  ? new Float32Array(d.normals)  : undefined,
      uvs:       d.uvs      ? new Float32Array(d.uvs)      : undefined,
      tangents:  d.tangents ? new Float32Array(d.tangents) : undefined,
      colors:    d.colors   ? new Float32Array(d.colors)   : undefined,
      indices:   new Uint32Array(d.indices),
    },
  }
}
