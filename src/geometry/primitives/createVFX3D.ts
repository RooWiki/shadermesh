import type { MeshData } from '../../core/MeshData'
import { createCylinder } from './createCylinder'
import { createPlane } from './createPlane'
import { createTube } from './createCurved3D'

// Deterministic hash 0..1 from integer seed
const hash = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x) }

export function createWedge3D(p: Record<string, number> = {}): MeshData {
  const w = Math.max(0.01, p.width ?? 1)
  const d = Math.max(0.01, p.depth ?? 0.6)
  const h = Math.max(0.01, p.height ?? 0.7)
  const hw = w / 2, hd = d / 2

  // 6 vertices: 4 bottom + 2 top (front edge only)
  // v0=BL(-x,-d), v1=BR(+x,-d), v2=FR(+x,+d), v3=FL(-x,+d), v4=TopL(-x,+d), v5=TopR(+x,+d)
  const v: [number, number, number][] = [
    [-hw, 0, -hd], [hw, 0, -hd], [hw, 0, hd], [-hw, 0, hd],
    [-hw, h, hd], [hw, h, hd],
  ]

  const pos: number[] = [], nrm: number[] = [], uvArr: number[] = [], idx: number[] = []

  const addQuad = (a: number, b: number, c: number, dd: number, uv: number[]) => {
    // Quad: a,b,c,d — compute normal from first triangle
    const va = v[a], vb = v[b], vc = v[c]
    const ex = vb[0] - va[0], ey = vb[1] - va[1], ez = vb[2] - va[2]
    const fx = vc[0] - va[0], fy = vc[1] - va[1], fz = vc[2] - va[2]
    let nx = ey * fz - ez * fy, ny = ez * fx - ex * fz, nz = ex * fy - ey * fx
    const nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1
    nx /= nl; ny /= nl; nz /= nl
    const base = pos.length / 3
    for (const vi of [a, b, c, dd]) {
      pos.push(...v[vi]); nrm.push(nx, ny, nz)
    }
    uvArr.push(...uv)
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3)
  }

  const addTri = (a: number, b: number, c: number, uv: number[]) => {
    const va = v[a], vb = v[b], vc = v[c]
    const ex = vb[0] - va[0], ey = vb[1] - va[1], ez = vb[2] - va[2]
    const fx = vc[0] - va[0], fy = vc[1] - va[1], fz = vc[2] - va[2]
    let nx = ey * fz - ez * fy, ny = ez * fx - ex * fz, nz = ex * fy - ey * fx
    const nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1
    nx /= nl; ny /= nl; nz /= nl
    const base = pos.length / 3
    for (const vi of [a, b, c]) { pos.push(...v[vi]); nrm.push(nx, ny, nz) }
    uvArr.push(...uv)
    idx.push(base, base + 1, base + 2)
  }

  addQuad(0, 1, 2, 3, [0, 0, 1, 0, 1, 1, 0, 1])   // bottom
  addQuad(3, 2, 5, 4, [0, 0, 1, 0, 1, 1, 0, 1])   // front (tall face)
  addQuad(0, 4, 5, 1, [0, 0, 0, 1, 1, 1, 1, 0])   // slope (back-to-front-top)
  addTri(0, 3, 4, [1, 0, 0, 0, 0.5, 1])            // left tri
  addTri(1, 5, 2, [0, 0, 1, 1, 1, 0])              // right tri

  return {
    positions: new Float32Array(pos), normals: new Float32Array(nrm),
    uvs: new Float32Array(uvArr), indices: new Uint32Array(idx),
  }
}

export function createSpike(p: Record<string, number> = {}): MeshData {
  return createCylinder({
    radiusTop: 0,
    radiusBottom: Math.max(0.005, p.radius ?? 0.12),
    height: Math.max(0.01, p.length ?? 1.5),
    radialSegments: Math.max(3, Math.round(p.segments ?? 12)),
    heightSegments: Math.max(1, Math.round(p.heightSegments ?? 6)),
  })
}

export function createShard(p: Record<string, number> = {}): MeshData {
  const sides = Math.max(3, Math.min(8, Math.round(p.sides ?? 5)))
  const radius = Math.max(0.01, p.radius ?? 0.35)
  const height = Math.max(0.01, p.height ?? 0.7)
  const irregularity = Math.max(0, Math.min(0.8, p.irregularity ?? 0.3))
  const halfH = height / 2

  const pos: number[] = [], nrm: number[] = [], uvArr: number[] = [], idx: number[] = []

  // Per-vertex jitter (deterministic)
  const angles: number[] = [], radii: number[] = [], topYs: number[] = []
  for (let i = 0; i < sides; i++) {
    const baseA = (i / sides) * Math.PI * 2
    angles.push(baseA + (hash(i * 3) - 0.5) * irregularity * Math.PI * 2 / sides)
    radii.push(radius * (1 + (hash(i * 3 + 1) - 0.5) * irregularity * 0.8))
    topYs.push(halfH * (1 + (hash(i * 3 + 2) - 0.5) * irregularity * 0.5))
  }

  // Side faces
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides
    const x0 = radii[i] * Math.cos(angles[i]), z0 = radii[i] * Math.sin(angles[i])
    const x1 = radii[j] * Math.cos(angles[j]), z1 = radii[j] * Math.sin(angles[j])
    const ty0 = topYs[i], ty1 = topYs[j]

    const mid = (angles[i] + angles[j]) / 2
    const ex = x1 - x0, ey = ty1 - ty0, ez = z1 - z0
    const fx = x0, fy = halfH * 2, fz = z0
    let nx = ey * (-halfH) - ez * 0, ny2 = ez * x0 - ex * (-halfH), nz = ex * 0 - ey * x0
    // Use midAngle outward as approximation
    nx = Math.cos(mid); ny2 = 0; nz = Math.sin(mid)

    const b = pos.length / 3
    pos.push(x0, ty0, z0, x1, ty1, z1, x1, -halfH, z1, x0, -halfH, z0)
    for (let v = 0; v < 4; v++) nrm.push(nx, ny2, nz)
    uvArr.push(0, 1, 1, 1, 1, 0, 0, 0)
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3)
  }

  // Top cap (fan from center)
  const tc = pos.length / 3
  // Compute centroid of top
  let cx = 0, cz = 0, cy = 0
  for (let i = 0; i < sides; i++) { cx += radii[i] * Math.cos(angles[i]); cz += radii[i] * Math.sin(angles[i]); cy += topYs[i] }
  cx /= sides; cz /= sides; cy /= sides
  pos.push(cx, cy, cz); nrm.push(0, 1, 0); uvArr.push(0.5, 0.5)
  for (let i = 0; i < sides; i++) {
    pos.push(radii[i] * Math.cos(angles[i]), topYs[i], radii[i] * Math.sin(angles[i]))
    nrm.push(0, 1, 0)
    uvArr.push(0.5 + 0.5 * Math.cos(angles[i]), 0.5 - 0.5 * Math.sin(angles[i]))
  }
  for (let i = 0; i < sides; i++) idx.push(tc, tc + 1 + (i + 1) % sides, tc + 1 + i)

  // Bottom cap
  const bc = pos.length / 3
  pos.push(0, -halfH, 0); nrm.push(0, -1, 0); uvArr.push(0.5, 0.5)
  for (let i = 0; i < sides; i++) {
    pos.push(radii[i] * Math.cos(angles[i]), -halfH, radii[i] * Math.sin(angles[i]))
    nrm.push(0, -1, 0)
    uvArr.push(0.5 + 0.5 * Math.cos(angles[i]), 0.5 + 0.5 * Math.sin(angles[i]))
  }
  for (let i = 0; i < sides; i++) idx.push(bc, bc + 1 + i, bc + 1 + (i + 1) % sides)

  return {
    positions: new Float32Array(pos), normals: new Float32Array(nrm),
    uvs: new Float32Array(uvArr), indices: new Uint32Array(idx),
  }
}

export function createCrystal(p: Record<string, number> = {}): MeshData {
  const sides = Math.max(3, Math.round(p.sides ?? 6))
  const radius = Math.max(0.01, p.radius ?? 0.22)
  const bodyH = Math.max(0, p.bodyHeight ?? 0.45)
  const tipH = Math.max(0.01, p.tipHeight ?? 0.5)
  const halfB = bodyH / 2

  const pos: number[] = [], nrm: number[] = [], uvArr: number[] = [], idx: number[] = []

  const apexTop: [number, number, number] = [0, halfB + tipH, 0]
  const apexBot: [number, number, number] = [0, -halfB - tipH, 0]

  for (let i = 0; i < sides; i++) {
    const a0 = (i / sides) * Math.PI * 2, a1 = ((i + 1) / sides) * Math.PI * 2
    const x0 = radius * Math.cos(a0), z0 = radius * Math.sin(a0)
    const x1 = radius * Math.cos(a1), z1 = radius * Math.sin(a1)

    // Body side face (quad) — only if bodyH > 0
    if (bodyH > 0) {
      const mid = (a0 + a1) / 2
      const nx = Math.cos(mid), nz = Math.sin(mid)
      const b = pos.length / 3
      pos.push(x0, halfB, z0, x1, halfB, z1, x1, -halfB, z1, x0, -halfB, z0)
      for (let v = 0; v < 4; v++) nrm.push(nx, 0, nz)
      uvArr.push(0, 1, 1, 1, 1, 0, 0, 0)
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3)
    }

    const computeN = (ap: [number, number, number], bv: [number, number, number], cv: [number, number, number]) => {
      const AB = [bv[0] - ap[0], bv[1] - ap[1], bv[2] - ap[2]]
      const AC = [cv[0] - ap[0], cv[1] - ap[1], cv[2] - ap[2]]
      let nx = AB[1] * AC[2] - AB[2] * AC[1]
      let ny = AB[2] * AC[0] - AB[0] * AC[2]
      let nz = AB[0] * AC[1] - AB[1] * AC[0]
      const nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1
      return [nx / nl, ny / nl, nz / nl]
    }

    // Top tip
    const nT = computeN(apexTop, [x1, halfB, z1], [x0, halfB, z0])
    const bt = pos.length / 3
    pos.push(apexTop[0], apexTop[1], apexTop[2], x1, halfB, z1, x0, halfB, z0)
    for (let v = 0; v < 3; v++) nrm.push(nT[0], nT[1], nT[2])
    uvArr.push(0.5, 1, 1, 0, 0, 0)
    idx.push(bt, bt + 1, bt + 2)

    // Bottom tip
    const nB = computeN(apexBot, [x0, -halfB, z0], [x1, -halfB, z1])
    const bb = pos.length / 3
    pos.push(apexBot[0], apexBot[1], apexBot[2], x0, -halfB, z0, x1, -halfB, z1)
    for (let v = 0; v < 3; v++) nrm.push(nB[0], nB[1], nB[2])
    uvArr.push(0.5, 0, 0, 1, 1, 1)
    idx.push(bb, bb + 1, bb + 2)
  }

  return {
    positions: new Float32Array(pos), normals: new Float32Array(nrm),
    uvs: new Float32Array(uvArr), indices: new Uint32Array(idx),
  }
}

// Ribbon: flat subdivided strip (UVs 0→1 along length)
export function createRibbon3D(p: Record<string, number> = {}): MeshData {
  return createPlane({
    width: Math.max(0.001, p.width ?? 0.2),
    height: Math.max(0.01, p.length ?? 2),
    subdivisionsX: Math.max(1, Math.round(p.widthSegments ?? 1)),
    subdivisionsY: Math.max(1, Math.round(p.lengthSegments ?? 20)),
  })
}

// Arc3D: curved arc band lying in XZ plane with height in Y
export function createArc3D(p: Record<string, number> = {}): MeshData {
  const radius = Math.max(0.01, p.radius ?? 0.5)
  const angleDeg = Math.min(360, Math.max(1, p.angle ?? 180))
  const angle = angleDeg * Math.PI / 180
  const height = Math.max(0.001, p.height ?? 0.15)
  const thickness = Math.max(0.001, p.thickness ?? 0.1)
  const segments = Math.max(2, Math.round(p.segments ?? 24))

  const outerR = radius + thickness / 2
  const innerR = Math.max(0.001, radius - thickness / 2)
  const halfH = height / 2

  const pos: number[] = [], nrm: number[] = [], uvArr: number[] = [], idx: number[] = []

  // Top face (y = halfH), bottom face (y = -halfH), outer wall, inner wall, 2 end caps
  const addArcFace = (r: number, nY: number, yy: number) => {
    const start = pos.length / 3
    for (let s = 0; s <= segments; s++) {
      const t = s / segments
      const a = -angle / 2 + t * angle
      const x = r * Math.cos(a), z = r * Math.sin(a)
      pos.push(x, yy, z); nrm.push(0, nY, 0); uvArr.push(t, nY > 0 ? 1 : 0)
    }
    return start
  }

  const outerTopStart = addArcFace(outerR, 1, halfH)
  const innerTopStart = addArcFace(innerR, 1, halfH)

  for (let s = 0; s < segments; s++) {
    const oa = outerTopStart + s, ob = oa + 1
    const ia = innerTopStart + s, ib = ia + 1
    idx.push(oa, ia, ob, ob, ia, ib) // top ring
  }

  const outerBotStart = addArcFace(outerR, -1, -halfH)
  const innerBotStart = addArcFace(innerR, -1, -halfH)

  for (let s = 0; s < segments; s++) {
    const oa = outerBotStart + s, ob = oa + 1
    const ia = innerBotStart + s, ib = ia + 1
    idx.push(oa, ob, ia, ob, ib, ia) // bottom ring
  }

  // Outer wall (connects outerTop to outerBot)
  const outWallStart = pos.length / 3
  for (let s = 0; s <= segments; s++) {
    const t = s / segments
    const a = -angle / 2 + t * angle
    const cosA = Math.cos(a), sinA = Math.sin(a)
    pos.push(outerR * cosA, halfH, outerR * sinA); nrm.push(cosA, 0, sinA); uvArr.push(t, 1)
    pos.push(outerR * cosA, -halfH, outerR * sinA); nrm.push(cosA, 0, sinA); uvArr.push(t, 0)
  }
  for (let s = 0; s < segments; s++) {
    const b = outWallStart + s * 2
    idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2)
  }

  // Inner wall (reversed normals)
  const inWallStart = pos.length / 3
  for (let s = 0; s <= segments; s++) {
    const t = s / segments
    const a = -angle / 2 + t * angle
    const cosA = Math.cos(a), sinA = Math.sin(a)
    pos.push(innerR * cosA, halfH, innerR * sinA); nrm.push(-cosA, 0, -sinA); uvArr.push(t, 1)
    pos.push(innerR * cosA, -halfH, innerR * sinA); nrm.push(-cosA, 0, -sinA); uvArr.push(t, 0)
  }
  for (let s = 0; s < segments; s++) {
    const b = inWallStart + s * 2
    idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3)
  }

  // End caps (two rectangular faces at each end of the arc)
  const addEndCap = (s: number) => {
    const t = s / segments
    const a = -angle / 2 + t * angle
    const cosA = Math.cos(a), sinA = Math.sin(a)
    // Tangent direction (perpendicular to radius in XZ)
    const tx = -sinA, tz = cosA
    const capN = s === 0 ? [-tx, 0, -tz] : [tx, 0, tz]
    const b = pos.length / 3
    pos.push(innerR * cosA, halfH, innerR * sinA); nrm.push(...capN); uvArr.push(0, 1)
    pos.push(outerR * cosA, halfH, outerR * sinA); nrm.push(...capN); uvArr.push(1, 1)
    pos.push(outerR * cosA, -halfH, outerR * sinA); nrm.push(...capN); uvArr.push(1, 0)
    pos.push(innerR * cosA, -halfH, innerR * sinA); nrm.push(...capN); uvArr.push(0, 0)
    if (s === 0) idx.push(b, b + 2, b + 1, b, b + 3, b + 2)
    else idx.push(b, b + 1, b + 2, b, b + 2, b + 3)
  }
  addEndCap(0)
  addEndCap(segments)

  return {
    positions: new Float32Array(pos), normals: new Float32Array(nrm),
    uvs: new Float32Array(uvArr), indices: new Uint32Array(idx),
  }
}

// Ring3D: washer/ring with height (short tube)
export function createRing3D(p: Record<string, number> = {}): MeshData {
  const outerR = Math.max(0.01, p.outerRadius ?? 0.5)
  const innerR = Math.max(0.001, Math.min(outerR - 0.005, p.innerRadius ?? 0.3))
  return createTube({
    outerRadius: outerR,
    innerRadius: innerR,
    height: Math.max(0.001, p.height ?? 0.1),
    segments: Math.max(3, Math.round(p.segments ?? 32)),
    heightSegments: 1,
  })
}
