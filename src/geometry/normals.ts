import type { MeshData } from '../core/MeshData'

export function recalculateFlatNormals(meshData: MeshData): MeshData {
  const { positions, indices } = meshData
  const normals = new Float32Array(positions.length)
  const triCount = indices.length / 3

  for (let t = 0; t < triCount; t++) {
    const a = indices[t * 3], b = indices[t * 3 + 1], c = indices[t * 3 + 2]
    const ax = positions[a*3], ay = positions[a*3+1], az = positions[a*3+2]
    const bx = positions[b*3], by = positions[b*3+1], bz = positions[b*3+2]
    const cx = positions[c*3], cy = positions[c*3+1], cz = positions[c*3+2]
    const ex = bx-ax, ey = by-ay, ez = bz-az
    const fx = cx-ax, fy = cy-ay, fz = cz-az
    let nx = ez*fy - ey*fz, ny = ex*fz - ez*fx, nz = ey*fx - ex*fy
    const len = Math.sqrt(nx*nx + ny*ny + nz*nz)
    if (len > 0) { nx /= len; ny /= len; nz /= len }
    for (const vi of [a, b, c]) {
      normals[vi*3] = nx; normals[vi*3+1] = ny; normals[vi*3+2] = nz
    }
  }

  return { ...meshData, normals }
}

export function recalculateSmoothNormals(meshData: MeshData): MeshData {
  const { positions, indices } = meshData
  const normals = new Float32Array(positions.length)
  const triCount = indices.length / 3

  for (let t = 0; t < triCount; t++) {
    const a = indices[t * 3], b = indices[t * 3 + 1], c = indices[t * 3 + 2]
    const ax = positions[a*3], ay = positions[a*3+1], az = positions[a*3+2]
    const bx = positions[b*3], by = positions[b*3+1], bz = positions[b*3+2]
    const cx = positions[c*3], cy = positions[c*3+1], cz = positions[c*3+2]
    const ex = bx-ax, ey = by-ay, ez = bz-az
    const fx = cx-ax, fy = cy-ay, fz = cz-az
    // Area-weighted: cross product magnitude = 2 * area
    const nx = ez*fy - ey*fz, ny = ex*fz - ez*fx, nz = ey*fx - ex*fy
    for (const vi of [a, b, c]) {
      normals[vi*3] += nx; normals[vi*3+1] += ny; normals[vi*3+2] += nz
    }
  }

  const vCount = normals.length / 3
  for (let i = 0; i < vCount; i++) {
    const len = Math.sqrt(normals[i*3]**2 + normals[i*3+1]**2 + normals[i*3+2]**2)
    if (len > 0) { normals[i*3] /= len; normals[i*3+1] /= len; normals[i*3+2] /= len }
  }

  return { ...meshData, normals }
}
