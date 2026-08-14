import type { MeshData } from '../core/MeshData'

export function calculateTangents(meshData: MeshData): MeshData {
  const { positions, normals, uvs, indices } = meshData
  if (!normals || !uvs) return meshData

  const vCount = positions.length / 3
  const tangents = new Float32Array(vCount * 4)
  const tan1 = new Float32Array(vCount * 3)
  const tan2 = new Float32Array(vCount * 3)
  const triCount = indices.length / 3

  for (let t = 0; t < triCount; t++) {
    const i0 = indices[t*3], i1 = indices[t*3+1], i2 = indices[t*3+2]

    const p0x = positions[i0*3], p0y = positions[i0*3+1], p0z = positions[i0*3+2]
    const p1x = positions[i1*3], p1y = positions[i1*3+1], p1z = positions[i1*3+2]
    const p2x = positions[i2*3], p2y = positions[i2*3+1], p2z = positions[i2*3+2]

    const u0 = uvs[i0*2], v0 = uvs[i0*2+1]
    const u1 = uvs[i1*2], v1 = uvs[i1*2+1]
    const u2 = uvs[i2*2], v2 = uvs[i2*2+1]

    const ex = p1x-p0x, ey = p1y-p0y, ez = p1z-p0z
    const fx = p2x-p0x, fy = p2y-p0y, fz = p2z-p0z
    const du1 = u1-u0, dv1 = v1-v0
    const du2 = u2-u0, dv2 = v2-v0

    const det = du1*dv2 - du2*dv1
    if (Math.abs(det) < 1e-10) continue
    const r = 1 / det

    const tx = (dv2*ex - dv1*fx) * r
    const ty = (dv2*ey - dv1*fy) * r
    const tz = (dv2*ez - dv1*fz) * r
    const bx = (du1*fx - du2*ex) * r
    const by = (du1*fy - du2*ey) * r
    const bz = (du1*fz - du2*ez) * r

    for (const vi of [i0, i1, i2]) {
      tan1[vi*3]   += tx; tan1[vi*3+1] += ty; tan1[vi*3+2] += tz
      tan2[vi*3]   += bx; tan2[vi*3+1] += by; tan2[vi*3+2] += bz
    }
  }

  // Gram-Schmidt orthogonalization per vertex + handedness
  for (let i = 0; i < vCount; i++) {
    const nx = normals[i*3], ny = normals[i*3+1], nz = normals[i*3+2]
    const tx = tan1[i*3],    ty = tan1[i*3+1],    tz = tan1[i*3+2]
    const bx = tan2[i*3],    by = tan2[i*3+1],    bz = tan2[i*3+2]

    // T' = normalize(T - N * dot(N, T))
    const dot = nx*tx + ny*ty + nz*tz
    let ox = tx - nx*dot, oy = ty - ny*dot, oz = tz - nz*dot
    const len = Math.sqrt(ox*ox + oy*oy + oz*oz)
    if (len > 1e-10) { ox /= len; oy /= len; oz /= len }

    // Handedness: sign of dot(cross(N, T), B)
    const cx = ny*oz - nz*oy, cy = nz*ox - nx*oz, cz = nx*oy - ny*ox
    const w = (cx*bx + cy*by + cz*bz) < 0 ? -1 : 1

    tangents[i*4]   = ox
    tangents[i*4+1] = oy
    tangents[i*4+2] = oz
    tangents[i*4+3] = w
  }

  return { ...meshData, tangents }
}
