import type { MeshData } from '../../core/MeshData'
import { createIcosphere } from './createCurved3D'

// Helper: expand a shared-vertex mesh to per-face vertices with flat normals
function flatExpand(positions: Float32Array, indices: Uint32Array, uvsFn?: (t: number, v: number) => [number, number]): MeshData {
  const nt = indices.length / 3
  const pos = new Float32Array(nt * 9)
  const nrm = new Float32Array(nt * 9)
  const uvArr = new Float32Array(nt * 6)
  const idx = new Uint32Array(nt * 3)

  for (let t = 0; t < nt; t++) {
    const ia = indices[t * 3], ib = indices[t * 3 + 1], ic = indices[t * 3 + 2]
    const ax = positions[ia * 3], ay = positions[ia * 3 + 1], az = positions[ia * 3 + 2]
    const bx = positions[ib * 3], by = positions[ib * 3 + 1], bz = positions[ib * 3 + 2]
    const cx = positions[ic * 3], cy = positions[ic * 3 + 1], cz = positions[ic * 3 + 2]
    const ex = bx - ax, ey = by - ay, ez = bz - az
    const fx = cx - ax, fy = cy - ay, fz = cz - az
    let nx = ey * fz - ez * fy, ny = ez * fx - ex * fz, nz = ex * fy - ey * fx
    const nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1
    nx /= nl; ny /= nl; nz /= nl

    const base = t * 3
    pos[base * 3] = ax; pos[base * 3 + 1] = ay; pos[base * 3 + 2] = az
    pos[base * 3 + 3] = bx; pos[base * 3 + 4] = by; pos[base * 3 + 5] = bz
    pos[base * 3 + 6] = cx; pos[base * 3 + 7] = cy; pos[base * 3 + 8] = cz
    for (let v = 0; v < 3; v++) {
      nrm[(base + v) * 3] = nx; nrm[(base + v) * 3 + 1] = ny; nrm[(base + v) * 3 + 2] = nz
      const uv = uvsFn ? uvsFn(t, v) : ([v === 0 ? 0 : v === 1 ? 1 : 0.5, v === 2 ? 1 : 0] as [number, number])
      uvArr[(base + v) * 2] = uv[0]; uvArr[(base + v) * 2 + 1] = uv[1]
    }
    idx[base] = base; idx[base + 1] = base + 1; idx[base + 2] = base + 2
  }
  return { positions: pos, normals: nrm, uvs: uvArr, indices: idx }
}

// N-gonal prism (flat shading)
export function createPrism(p: Record<string, number> = {}): MeshData {
  const sides = Math.max(3, Math.round(p.sides ?? 6))
  const radius = Math.max(0.01, p.radius ?? 0.5)
  const height = Math.max(0.01, p.height ?? 1)
  const halfH = height / 2

  const pos: number[] = [], nrm: number[] = [], uvArr: number[] = [], idx: number[] = []

  for (let i = 0; i < sides; i++) {
    const a0 = (i / sides) * Math.PI * 2
    const a1 = ((i + 1) / sides) * Math.PI * 2
    const mid = (a0 + a1) / 2
    const nx = Math.cos(mid), nz = Math.sin(mid)
    const x0 = radius * Math.cos(a0), z0 = radius * Math.sin(a0)
    const x1 = radius * Math.cos(a1), z1 = radius * Math.sin(a1)
    const b = pos.length / 3
    // Top-left, Top-right, Bottom-right, Bottom-left
    pos.push(x0, halfH, z0, x1, halfH, z1, x1, -halfH, z1, x0, -halfH, z0)
    for (let v = 0; v < 4; v++) { nrm.push(nx, 0, nz) }
    uvArr.push(0, 1, 1, 1, 1, 0, 0, 0)
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3)
  }

  // Top cap
  const tc = pos.length / 3
  pos.push(0, halfH, 0); nrm.push(0, 1, 0); uvArr.push(0.5, 0.5)
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2
    pos.push(radius * Math.cos(a), halfH, radius * Math.sin(a))
    nrm.push(0, 1, 0)
    uvArr.push(0.5 + 0.5 * Math.cos(a), 0.5 - 0.5 * Math.sin(a))
  }
  for (let i = 0; i < sides; i++) {
    idx.push(tc, tc + 1 + (i + 1) % sides, tc + 1 + i)
  }

  // Bottom cap
  const bc = pos.length / 3
  pos.push(0, -halfH, 0); nrm.push(0, -1, 0); uvArr.push(0.5, 0.5)
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2
    pos.push(radius * Math.cos(a), -halfH, radius * Math.sin(a))
    nrm.push(0, -1, 0)
    uvArr.push(0.5 + 0.5 * Math.cos(a), 0.5 + 0.5 * Math.sin(a))
  }
  for (let i = 0; i < sides; i++) {
    idx.push(bc, bc + 1 + i, bc + 1 + (i + 1) % sides)
  }

  return {
    positions: new Float32Array(pos), normals: new Float32Array(nrm),
    uvs: new Float32Array(uvArr), indices: new Uint32Array(idx),
  }
}

// N-gonal pyramid (flat shading)
export function createPyramid(p: Record<string, number> = {}): MeshData {
  const sides = Math.max(3, Math.round(p.sides ?? 4))
  const radius = Math.max(0.01, p.radius ?? 0.5)
  const height = Math.max(0.01, p.height ?? 1)

  const pos: number[] = [], nrm: number[] = [], uvArr: number[] = [], idx: number[] = []

  for (let i = 0; i < sides; i++) {
    const a0 = (i / sides) * Math.PI * 2
    const a1 = ((i + 1) / sides) * Math.PI * 2
    const b0x = radius * Math.cos(a0), b0z = radius * Math.sin(a0)
    const b1x = radius * Math.cos(a1), b1z = radius * Math.sin(a1)

    // Winding: apex, base_next, base_curr → outward normal
    const ABx = b1x, ABy = -height, ABz = b1z
    const ACx = b0x, ACy = -height, ACz = b0z
    let nx = ABy * ACz - ABz * ACy, ny = ABz * ACx - ABx * ACz, nz = ABx * ACy - ABy * ACx
    const nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1
    nx /= nl; ny /= nl; nz /= nl

    const b = pos.length / 3
    pos.push(0, height, 0, b1x, 0, b1z, b0x, 0, b0z)
    nrm.push(nx, ny, nz, nx, ny, nz, nx, ny, nz)
    uvArr.push(0.5, 1, 0, 0, 1, 0)
    idx.push(b, b + 1, b + 2)
  }

  // Base cap
  const bc = pos.length / 3
  pos.push(0, 0, 0); nrm.push(0, -1, 0); uvArr.push(0.5, 0.5)
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2
    pos.push(radius * Math.cos(a), 0, radius * Math.sin(a))
    nrm.push(0, -1, 0)
    uvArr.push(0.5 + 0.5 * Math.cos(a), 0.5 + 0.5 * Math.sin(a))
  }
  for (let i = 0; i < sides; i++) {
    idx.push(bc, bc + 1 + i, bc + 1 + (i + 1) % sides)
  }

  return {
    positions: new Float32Array(pos), normals: new Float32Array(nrm),
    uvs: new Float32Array(uvArr), indices: new Uint32Array(idx),
  }
}

export function createTetrahedron(p: Record<string, number> = {}): MeshData {
  const radius = Math.max(0.01, p.radius ?? 0.5)
  // Regular tetrahedron inscribed in unit sphere
  const s = radius
  const raw: [number, number, number][] = [
    [1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1],
  ]
  const verts = raw.map(v => {
    const len = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2)
    return [v[0] / len * s, v[1] / len * s, v[2] / len * s] as [number, number, number]
  })

  // 4 faces (CCW from outside)
  const faceIdx: [number, number, number][] = [
    [0, 1, 2], [0, 2, 3], [0, 3, 1], [1, 3, 2],
  ]

  const rawPos = new Float32Array(verts.flatMap(v => v))
  const rawIdx = new Uint32Array(faceIdx.flatMap(f => f))
  return flatExpand(rawPos, rawIdx)
}

export function createTruncatedPyramid(p: Record<string, number> = {}): MeshData {
  const sides = Math.max(3, Math.round(p.sides ?? 4))
  const baseRadius = Math.max(0.01, p.baseRadius ?? 0.5)
  const topRadius = Math.max(0.005, Math.min(baseRadius - 0.005, p.topRadius ?? 0.2))
  const height = Math.max(0.01, p.height ?? 1)
  const halfH = height / 2

  const pos: number[] = [], nrm: number[] = [], uvArr: number[] = [], idx: number[] = []

  // Side faces (quads)
  for (let i = 0; i < sides; i++) {
    const a0 = (i / sides) * Math.PI * 2, a1 = ((i + 1) / sides) * Math.PI * 2
    const mid = (a0 + a1) / 2

    const bx0 = baseRadius * Math.cos(a0), bz0 = baseRadius * Math.sin(a0)
    const bx1 = baseRadius * Math.cos(a1), bz1 = baseRadius * Math.sin(a1)
    const tx0 = topRadius * Math.cos(a0), tz0 = topRadius * Math.sin(a0)
    const tx1 = topRadius * Math.cos(a1), tz1 = topRadius * Math.sin(a1)

    const slopeY = (baseRadius - topRadius) / Math.sqrt(height * height + (baseRadius - topRadius) ** 2)
    let nx = Math.cos(mid), ny = slopeY, nz = Math.sin(mid)
    const sl = Math.sqrt(nx * nx + ny * ny + nz * nz)
    nx /= sl; ny /= sl; nz /= sl

    const b = pos.length / 3
    pos.push(bx0, -halfH, bz0, bx1, -halfH, bz1, tx1, halfH, tz1, tx0, halfH, tz0)
    for (let v = 0; v < 4; v++) nrm.push(nx, ny, nz)
    uvArr.push(0, 0, 1, 0, 1, 1, 0, 1)
    idx.push(b, b + 2, b + 1, b, b + 3, b + 2)
  }

  // Top cap
  const tc = pos.length / 3
  pos.push(0, halfH, 0); nrm.push(0, 1, 0); uvArr.push(0.5, 0.5)
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2
    pos.push(topRadius * Math.cos(a), halfH, topRadius * Math.sin(a))
    nrm.push(0, 1, 0)
    uvArr.push(0.5 + 0.5 * Math.cos(a), 0.5 - 0.5 * Math.sin(a))
  }
  for (let i = 0; i < sides; i++) idx.push(tc, tc + 1 + (i + 1) % sides, tc + 1 + i)

  // Bottom cap
  const bc2 = pos.length / 3
  pos.push(0, -halfH, 0); nrm.push(0, -1, 0); uvArr.push(0.5, 0.5)
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2
    pos.push(baseRadius * Math.cos(a), -halfH, baseRadius * Math.sin(a))
    nrm.push(0, -1, 0)
    uvArr.push(0.5 + 0.5 * Math.cos(a), 0.5 + 0.5 * Math.sin(a))
  }
  for (let i = 0; i < sides; i++) idx.push(bc2, bc2 + 1 + i, bc2 + 1 + (i + 1) % sides)

  return {
    positions: new Float32Array(pos), normals: new Float32Array(nrm),
    uvs: new Float32Array(uvArr), indices: new Uint32Array(idx),
  }
}

export function createOctahedron(p: Record<string, number> = {}): MeshData {
  const r = Math.max(0.01, p.radius ?? 0.5)

  const rawPos = new Float32Array([
    r, 0, 0, -r, 0, 0, 0, r, 0, 0, -r, 0, 0, 0, r, 0, 0, -r,
  ])
  // v0=+x, v1=-x, v2=+y, v3=-y, v4=+z, v5=-z
  // 8 faces (CCW from outside)
  const rawIdx = new Uint32Array([
    0, 2, 4,  0, 4, 3,  0, 3, 5,  0, 5, 2,
    1, 4, 2,  1, 3, 4,  1, 5, 3,  1, 2, 5,
  ])
  const uv3 = (_t: number, v: number): [number, number] => {
    if (v === 0) return [0.5, 1]
    if (v === 1) return [0, 0]
    return [1, 0]
  }
  return flatExpand(rawPos, rawIdx, uv3)
}

export function createIcosahedron(p: Record<string, number> = {}): MeshData {
  const r = Math.max(0.01, p.radius ?? 0.5)
  const t = (1 + Math.sqrt(5)) / 2
  const rawVerts: number[] = [
    -1, t, 0, 1, t, 0, -1, -t, 0, 1, -t, 0,
    0, -1, t, 0, 1, t, 0, -1, -t, 0, 1, -t,
    t, 0, -1, t, 0, 1, -t, 0, -1, -t, 0, 1,
  ]
  // Normalize and scale
  const pos = new Float32Array(rawVerts.length)
  for (let i = 0; i < rawVerts.length / 3; i++) {
    const x = rawVerts[i * 3], y = rawVerts[i * 3 + 1], z = rawVerts[i * 3 + 2]
    const len = Math.sqrt(x * x + y * y + z * z)
    pos[i * 3] = x / len * r; pos[i * 3 + 1] = y / len * r; pos[i * 3 + 2] = z / len * r
  }
  const rawIdx = new Uint32Array([
    0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11,
    1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8,
    3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9,
    4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1,
  ])
  return flatExpand(pos, rawIdx)
}

export function createDodecahedron(p: Record<string, number> = {}): MeshData {
  const r = Math.max(0.01, p.radius ?? 0.5)
  const t = (1 + Math.sqrt(5)) / 2
  const rt = 1 / t
  const rawV = [
    -1, -1, -1, -1, -1, 1, -1, 1, -1, -1, 1, 1,
    1, -1, -1, 1, -1, 1, 1, 1, -1, 1, 1, 1,
    0, -rt, -t, 0, -rt, t, 0, rt, -t, 0, rt, t,
    -rt, -t, 0, -rt, t, 0, rt, -t, 0, rt, t, 0,
    -t, 0, -rt, t, 0, -rt, -t, 0, rt, t, 0, rt,
  ]
  const nv = rawV.length / 3
  const positions = new Float32Array(nv * 3)
  for (let i = 0; i < nv; i++) {
    const x = rawV[i * 3], y = rawV[i * 3 + 1], z = rawV[i * 3 + 2]
    const len = Math.sqrt(x * x + y * y + z * z)
    positions[i * 3] = x / len * r; positions[i * 3 + 1] = y / len * r; positions[i * 3 + 2] = z / len * r
  }
  // Triangulated face indices (from Three.js DodecahedronGeometry)
  const rawIdx = new Uint32Array([
    3, 11, 7, 3, 7, 15, 3, 15, 13,
    7, 19, 17, 7, 17, 6, 7, 6, 15,
    17, 4, 8, 17, 8, 10, 17, 10, 6,
    8, 0, 16, 8, 16, 2, 8, 2, 10,
    0, 12, 1, 0, 1, 18, 0, 18, 16,
    6, 10, 2, 6, 2, 13, 6, 13, 15,
    2, 16, 18, 2, 18, 3, 2, 3, 13,
    18, 1, 9, 18, 9, 11, 18, 11, 3,
    4, 14, 12, 4, 12, 0, 4, 0, 8,
    11, 9, 5, 11, 5, 19, 11, 19, 7,
    19, 5, 14, 19, 14, 4, 19, 4, 17,
    1, 12, 14, 1, 14, 5, 1, 5, 9,
  ])
  // Use smooth normals (no flatExpand) — computeVertexNormals gives good results
  const uvs = new Float32Array(nv * 2)
  for (let i = 0; i < nv; i++) {
    const x = positions[i * 3], y = positions[i * 3 + 1], z = positions[i * 3 + 2]
    const len = r || 1
    uvs[i * 2] = 0.5 + Math.atan2(z / len, x / len) / (Math.PI * 2)
    uvs[i * 2 + 1] = 0.5 - Math.asin(Math.max(-1, Math.min(1, y / len))) / Math.PI
  }
  return { positions, uvs, indices: rawIdx }
}

export function createDiamond(p: Record<string, number> = {}): MeshData {
  const sides = Math.max(3, Math.round(p.sides ?? 8))
  const radius = Math.max(0.01, p.radius ?? 0.4)
  const topH = Math.max(0.01, p.topHeight ?? 0.3)
  const botH = Math.max(0.01, p.bottomHeight ?? 0.7)
  const waistY = (topH - botH) / 2 // center waist

  const pos: number[] = [], nrm: number[] = [], uvArr: number[] = [], idx: number[] = []

  for (let i = 0; i < sides; i++) {
    const a0 = (i / sides) * Math.PI * 2, a1 = ((i + 1) / sides) * Math.PI * 2
    const x0 = radius * Math.cos(a0), z0 = radius * Math.sin(a0)
    const x1 = radius * Math.cos(a1), z1 = radius * Math.sin(a1)

    // Top facet: waist → upper apex
    const computeNormal = (apex: [number, number, number], b0: [number, number, number], b1: [number, number, number]) => {
      const AB = [b1[0] - apex[0], b1[1] - apex[1], b1[2] - apex[2]]
      const AC = [b0[0] - apex[0], b0[1] - apex[1], b0[2] - apex[2]]
      let nx = AB[1] * AC[2] - AB[2] * AC[1]
      let ny = AB[2] * AC[0] - AB[0] * AC[2]
      let nz = AB[0] * AC[1] - AB[1] * AC[0]
      const nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1
      return [nx / nl, ny / nl, nz / nl]
    }

    const apexTop: [number, number, number] = [0, waistY + topH, 0]
    const apexBot: [number, number, number] = [0, waistY - botH, 0]
    const w0: [number, number, number] = [x0, waistY, z0]
    const w1: [number, number, number] = [x1, waistY, z1]

    const nTop = computeNormal(apexTop, w0, w1)
    const nBot = computeNormal(apexBot, w1, w0)

    const b = pos.length / 3
    pos.push(apexTop[0], apexTop[1], apexTop[2], w1[0], w1[1], w1[2], w0[0], w0[1], w0[2])
    for (let v = 0; v < 3; v++) nrm.push(nTop[0], nTop[1], nTop[2])
    uvArr.push(0.5, 1, 0, 0, 1, 0)
    idx.push(b, b + 1, b + 2)

    const bb = pos.length / 3
    pos.push(apexBot[0], apexBot[1], apexBot[2], w0[0], w0[1], w0[2], w1[0], w1[1], w1[2])
    for (let v = 0; v < 3; v++) nrm.push(nBot[0], nBot[1], nBot[2])
    uvArr.push(0.5, 0, 0, 1, 1, 1)
    idx.push(bb, bb + 1, bb + 2)
  }

  return {
    positions: new Float32Array(pos), normals: new Float32Array(nrm),
    uvs: new Float32Array(uvArr), indices: new Uint32Array(idx),
  }
}

// Jittered icosphere for an irregular polyhedron
export function createIrregularPolyhedron(p: Record<string, number> = {}): MeshData {
  const radius = Math.max(0.01, p.radius ?? 0.5)
  const subdivisions = Math.max(0, Math.min(3, Math.round(p.subdivisions ?? 1)))
  const irregularity = Math.max(0, Math.min(0.9, p.irregularity ?? 0.35))

  const base = createIcosphere({ radius, subdivisions })
  const nv = base.positions.length / 3

  // Deterministic per-vertex jitter using index-based hash
  const hash = (i: number) => {
    const x = Math.sin(i * 127.1 + 311.7) * 43758.5453
    return x - Math.floor(x)
  }

  for (let i = 0; i < nv; i++) {
    const jitter = (hash(i) - 0.5) * irregularity * radius
    const x = base.positions[i * 3], y = base.positions[i * 3 + 1], z = base.positions[i * 3 + 2]
    const len = Math.sqrt(x * x + y * y + z * z) || 1
    const scale = (len + jitter) / len
    base.positions[i * 3] *= scale
    base.positions[i * 3 + 1] *= scale
    base.positions[i * 3 + 2] *= scale
  }

  // Drop normals so renderer recomputes (smooth) after jitter
  return { positions: base.positions, uvs: base.uvs, indices: base.indices }
}
