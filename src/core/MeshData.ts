export interface MeshData {
  positions: Float32Array   // 3 floats per vertex: x, y, z
  normals?: Float32Array    // 3 floats per vertex: nx, ny, nz
  uvs?: Float32Array        // 2 floats per vertex: u, v
  tangents?: Float32Array   // 4 floats per vertex: tx, ty, tz, handedness
  colors?: Float32Array     // 4 floats per vertex: r, g, b, a
  indices: Uint32Array      // triangle indices (3 per triangle)
}

export interface MeshDataStats {
  vertexCount: number
  triangleCount: number
  hasNormals: boolean
  hasUVs: boolean
  hasTangents: boolean
  hasColors: boolean
  bytesPositions: number
  bytesNormals: number
  bytesUVs: number
  bytesTangents: number
  bytesColors: number
  bytesIndices: number
  bytesTotal: number
}

export function getMeshStats(mesh: MeshData): MeshDataStats {
  const vc = mesh.positions.length / 3
  const tc = mesh.indices.length / 3
  const bp = mesh.positions.byteLength
  const bn = mesh.normals?.byteLength ?? 0
  const bu = mesh.uvs?.byteLength ?? 0
  const bt = mesh.tangents?.byteLength ?? 0
  const bc = mesh.colors?.byteLength ?? 0
  const bi = mesh.indices.byteLength
  return {
    vertexCount: vc,
    triangleCount: tc,
    hasNormals: mesh.normals != null,
    hasUVs: mesh.uvs != null,
    hasTangents: mesh.tangents != null,
    hasColors: mesh.colors != null,
    bytesPositions: bp,
    bytesNormals: bn,
    bytesUVs: bu,
    bytesTangents: bt,
    bytesColors: bc,
    bytesIndices: bi,
    bytesTotal: bp + bn + bu + bt + bc + bi,
  }
}

export function cloneMeshData(mesh: MeshData): MeshData {
  return {
    positions: mesh.positions.slice(),
    normals: mesh.normals?.slice(),
    uvs: mesh.uvs?.slice(),
    tangents: mesh.tangents?.slice(),
    colors: mesh.colors?.slice(),
    indices: mesh.indices.slice(),
  }
}
