import type { MeshData } from '../../core/MeshData'
import { createSphere } from './createSphere'
import { createCylinder } from './createCylinder'

export function createUVSphere(p: Record<string, number> = {}): MeshData {
  return createSphere({
    radius: Math.max(0.01, p.radius ?? 0.5),
    widthSegments: Math.max(3, Math.round(p.segments ?? 32)),
    heightSegments: Math.max(2, Math.round(p.rings ?? 16)),
  })
}

export function createIcosphere(p: Record<string, number> = {}): MeshData {
  const radius = Math.max(0.01, p.radius ?? 0.5)
  const subdivisions = Math.max(0, Math.min(4, Math.round(p.subdivisions ?? 2)))

  const t = (1 + Math.sqrt(5)) / 2
  let verts: [number, number, number][] = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ]
  verts = verts.map(v => {
    const len = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2)
    return [v[0] / len, v[1] / len, v[2] / len]
  })

  let tris: [number, number, number][] = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ]

  for (let s = 0; s < subdivisions; s++) {
    const cache = new Map<string, number>()
    const newTris: [number, number, number][] = []
    const mid = (a: number, b: number): number => {
      const key = a < b ? `${a}_${b}` : `${b}_${a}`
      if (cache.has(key)) return cache.get(key)!
      const va = verts[a], vb = verts[b]
      const mx = (va[0] + vb[0]) / 2, my = (va[1] + vb[1]) / 2, mz = (va[2] + vb[2]) / 2
      const len = Math.sqrt(mx * mx + my * my + mz * mz)
      verts.push([mx / len, my / len, mz / len])
      const i = verts.length - 1
      cache.set(key, i)
      return i
    }
    for (const [a, b, c] of tris) {
      const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a)
      newTris.push([a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca])
    }
    tris = newTris
  }

  const nv = verts.length, nt = tris.length
  const positions = new Float32Array(nv * 3)
  const normals = new Float32Array(nv * 3)
  const uvs = new Float32Array(nv * 2)
  const indices = new Uint32Array(nt * 3)

  for (let i = 0; i < nv; i++) {
    const [x, y, z] = verts[i]
    positions[i * 3] = x * radius; positions[i * 3 + 1] = y * radius; positions[i * 3 + 2] = z * radius
    normals[i * 3] = x; normals[i * 3 + 1] = y; normals[i * 3 + 2] = z
    uvs[i * 2] = 0.5 + Math.atan2(z, x) / (Math.PI * 2)
    uvs[i * 2 + 1] = 0.5 - Math.asin(Math.max(-1, Math.min(1, y))) / Math.PI
  }
  for (let i = 0; i < nt; i++) {
    indices[i * 3] = tris[i][0]; indices[i * 3 + 1] = tris[i][1]; indices[i * 3 + 2] = tris[i][2]
  }
  return { positions, normals, uvs, indices }
}

export function createHemisphere(p: Record<string, number> = {}): MeshData {
  const radius = Math.max(0.01, p.radius ?? 0.5)
  const segments = Math.max(3, Math.round(p.segments ?? 32))
  const rings = Math.max(1, Math.round(p.rings ?? 8))

  const pos: number[] = [], nrm: number[] = [], uvArr: number[] = [], idx: number[] = []

  for (let y = 0; y <= rings; y++) {
    const phi = (y / rings) * (Math.PI / 2)
    const sinPhi = Math.sin(phi), cosPhi = Math.cos(phi)
    for (let x = 0; x <= segments; x++) {
      const theta = (x / segments) * Math.PI * 2
      const nx = sinPhi * Math.cos(theta), ny = cosPhi, nz = sinPhi * Math.sin(theta)
      pos.push(nx * radius, ny * radius, nz * radius)
      nrm.push(nx, ny, nz)
      uvArr.push(x / segments, 1 - (y / rings) * 0.5)
    }
  }
  for (let y = 0; y < rings; y++) {
    for (let x = 0; x < segments; x++) {
      const a = y * (segments + 1) + x
      const b = a + 1, c = a + (segments + 1), d = c + 1
      idx.push(a, b, c, b, d, c)
    }
  }

  // Flat base cap (normal = -y)
  const capCenter = pos.length / 3
  pos.push(0, 0, 0); nrm.push(0, -1, 0); uvArr.push(0.5, 0.5)
  for (let x = 0; x <= segments; x++) {
    const theta = (x / segments) * Math.PI * 2
    const cosT = Math.cos(theta), sinT = Math.sin(theta)
    pos.push(radius * cosT, 0, radius * sinT)
    nrm.push(0, -1, 0)
    uvArr.push(0.5 + 0.5 * cosT, 0.5 + 0.5 * sinT)
  }
  for (let x = 0; x < segments; x++) {
    idx.push(capCenter, capCenter + 1 + x, capCenter + 1 + x + 1)
  }

  return {
    positions: new Float32Array(pos), normals: new Float32Array(nrm),
    uvs: new Float32Array(uvArr), indices: new Uint32Array(idx),
  }
}

export function createDome(p: Record<string, number> = {}): MeshData {
  return createHemisphere({ radius: p.radius ?? 0.5, segments: p.segments ?? 32, rings: p.rings ?? 10 })
}

export function createEllipsoid(p: Record<string, number> = {}): MeshData {
  const rx = Math.max(0.01, p.radiusX ?? 0.6)
  const ry = Math.max(0.01, p.radiusY ?? 0.5)
  const rz = Math.max(0.01, p.radiusZ ?? 0.4)
  const ws = Math.max(3, Math.round(p.segments ?? 24))
  const hs = Math.max(2, Math.round(p.rings ?? 12))

  const nv = (ws + 1) * (hs + 1)
  const positions = new Float32Array(nv * 3)
  const normals = new Float32Array(nv * 3)
  const uvs = new Float32Array(nv * 2)

  let vi = 0
  for (let y = 0; y <= hs; y++) {
    const phi = (y / hs) * Math.PI
    const sinPhi = Math.sin(phi), cosPhi = Math.cos(phi)
    for (let x = 0; x <= ws; x++) {
      const theta = (x / ws) * Math.PI * 2
      const px = rx * sinPhi * Math.cos(theta)
      const py = ry * cosPhi
      const pz = rz * sinPhi * Math.sin(theta)
      positions[vi * 3] = px; positions[vi * 3 + 1] = py; positions[vi * 3 + 2] = pz
      // Ellipsoid normal = gradient of x²/rx² + y²/ry² + z²/rz²
      const ngx = px / (rx * rx), ngy = py / (ry * ry), ngz = pz / (rz * rz)
      const nlen = Math.sqrt(ngx * ngx + ngy * ngy + ngz * ngz) || 1
      normals[vi * 3] = ngx / nlen; normals[vi * 3 + 1] = ngy / nlen; normals[vi * 3 + 2] = ngz / nlen
      uvs[vi * 2] = x / ws; uvs[vi * 2 + 1] = 1 - y / hs
      vi++
    }
  }

  const idxArr: number[] = []
  for (let y = 0; y < hs; y++) {
    for (let x = 0; x < ws; x++) {
      const a = y * (ws + 1) + x, b = a + 1, c = a + (ws + 1), d = c + 1
      if (y !== 0) idxArr.push(a, b, c)
      if (y !== hs - 1) idxArr.push(b, d, c)
    }
  }
  return { positions, normals, uvs, indices: new Uint32Array(idxArr) }
}

export function createTube(p: Record<string, number> = {}): MeshData {
  const outerR = Math.max(0.01, p.outerRadius ?? 0.5)
  const innerR = Math.max(0.001, Math.min(outerR - 0.005, p.innerRadius ?? 0.35))
  const height = Math.max(0.001, p.height ?? 1)
  const segments = Math.max(3, Math.round(p.segments ?? 16))
  const hSegs = Math.max(1, Math.round(p.heightSegments ?? 1))
  const halfH = height / 2

  const pos: number[] = [], nrm: number[] = [], uvArr: number[] = [], idx: number[] = []

  const addCylSide = (r: number, nSign: number, uOffset: number) => {
    const start = pos.length / 3
    for (let y = 0; y <= hSegs; y++) {
      const t = y / hSegs
      const yy = halfH - t * height
      for (let x = 0; x <= segments; x++) {
        const theta = (x / segments) * Math.PI * 2
        const cosT = Math.cos(theta), sinT = Math.sin(theta)
        pos.push(r * cosT, yy, r * sinT)
        nrm.push(nSign * cosT, 0, nSign * sinT)
        uvArr.push(uOffset + x / segments * 0.5, 1 - t)
      }
    }
    for (let y = 0; y < hSegs; y++) {
      for (let x = 0; x < segments; x++) {
        const a = start + y * (segments + 1) + x
        const b = a + 1, c = a + (segments + 1), d = c + 1
        if (nSign > 0) idx.push(a, b, c, b, d, c)
        else idx.push(a, c, b, b, c, d)
      }
    }
  }

  addCylSide(outerR, 1, 0)
  addCylSide(innerR, -1, 0.5)

  // Top and bottom rings
  const addRing = (yy: number, nY: number) => {
    const ringStart = pos.length / 3
    for (let x = 0; x <= segments; x++) {
      const theta = (x / segments) * Math.PI * 2
      const cosT = Math.cos(theta), sinT = Math.sin(theta)
      pos.push(outerR * cosT, yy, outerR * sinT); nrm.push(0, nY, 0)
      uvArr.push(0.5 + 0.5 * cosT, 0.5 + nY * 0.5 * sinT)
      pos.push(innerR * cosT, yy, innerR * sinT); nrm.push(0, nY, 0)
      uvArr.push(0.5 + 0.5 * innerR / outerR * cosT, 0.5 + nY * 0.5 * innerR / outerR * sinT)
    }
    for (let x = 0; x < segments; x++) {
      const a = ringStart + x * 2, b = a + 2, c = a + 1, d = b + 1
      if (nY > 0) idx.push(a, c, b, b, c, d)
      else idx.push(a, b, c, b, d, c)
    }
  }

  addRing(halfH, 1)
  addRing(-halfH, -1)

  return {
    positions: new Float32Array(pos), normals: new Float32Array(nrm),
    uvs: new Float32Array(uvArr), indices: new Uint32Array(idx),
  }
}

export function createFrustum(p: Record<string, number> = {}): MeshData {
  return createCylinder({
    radiusTop: Math.max(0.001, p.radiusTop ?? 0.3),
    radiusBottom: Math.max(0.001, p.radiusBottom ?? 0.5),
    height: Math.max(0.001, p.height ?? 1),
    radialSegments: Math.max(3, Math.round(p.segments ?? 16)),
    heightSegments: Math.max(1, Math.round(p.heightSegments ?? 1)),
  })
}
