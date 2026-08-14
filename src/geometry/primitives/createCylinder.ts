import type { MeshData } from '../../core/MeshData'

export interface CylinderParams {
  radiusTop?: number
  radiusBottom?: number
  height?: number
  radialSegments?: number
  heightSegments?: number
}

export function createCylinder(params: CylinderParams = {}): MeshData {
  const {
    radiusTop = 0.5,
    radiusBottom = 0.5,
    height = 1,
    radialSegments = 16,
    heightSegments = 1,
  } = params

  const rs = Math.max(3, Math.round(radialSegments))
  const hs = Math.max(1, Math.round(heightSegments))
  const halfH = height / 2

  const pos: number[] = []
  const nrm: number[] = []
  const uvArr: number[] = []
  const idx: number[] = []

  // Lateral normal: perpendicular to the slope in radial/Y space
  // slope direction (top→bottom): (dr, -height) → normal: (height, dr) normalized
  const dr = radiusBottom - radiusTop
  const slopeLen = Math.sqrt(height * height + dr * dr)
  const nRadial = slopeLen > 0 ? height / slopeLen : 1
  const nY      = slopeLen > 0 ? dr / slopeLen : 0

  // ── Side ─────────────────────────────────────────────
  const sideBase = 0
  for (let y = 0; y <= hs; y++) {
    const t = y / hs
    const r = radiusTop + dr * t
    const py = halfH - t * height
    for (let x = 0; x <= rs; x++) {
      const theta = (x / rs) * Math.PI * 2
      const cosT = Math.cos(theta), sinT = Math.sin(theta)
      pos.push(r * cosT, py, r * sinT)
      nrm.push(nRadial * cosT, nY, nRadial * sinT)
      uvArr.push(x / rs, 1 - t)
    }
  }
  for (let y = 0; y < hs; y++) {
    for (let x = 0; x < rs; x++) {
      const a = sideBase + y * (rs + 1) + x
      const b = a + 1
      const c = a + (rs + 1)
      const d = c + 1
      idx.push(a, b, c, b, d, c)
    }
  }

  // ── Top cap ──────────────────────────────────────────
  if (radiusTop > 0) {
    const base = pos.length / 3
    pos.push(0, halfH, 0); nrm.push(0, 1, 0); uvArr.push(0.5, 0.5)
    for (let x = 0; x <= rs; x++) {
      const theta = (x / rs) * Math.PI * 2
      const cosT = Math.cos(theta), sinT = Math.sin(theta)
      pos.push(radiusTop * cosT, halfH, radiusTop * sinT)
      nrm.push(0, 1, 0)
      uvArr.push(0.5 + 0.5 * cosT, 0.5 - 0.5 * sinT)
    }
    for (let x = 0; x < rs; x++) {
      idx.push(base, base + 1 + x + 1, base + 1 + x)
    }
  }

  // ── Bottom cap ────────────────────────────────────────
  if (radiusBottom > 0) {
    const base = pos.length / 3
    pos.push(0, -halfH, 0); nrm.push(0, -1, 0); uvArr.push(0.5, 0.5)
    for (let x = 0; x <= rs; x++) {
      const theta = (x / rs) * Math.PI * 2
      const cosT = Math.cos(theta), sinT = Math.sin(theta)
      pos.push(radiusBottom * cosT, -halfH, radiusBottom * sinT)
      nrm.push(0, -1, 0)
      uvArr.push(0.5 + 0.5 * cosT, 0.5 + 0.5 * sinT)
    }
    for (let x = 0; x < rs; x++) {
      idx.push(base, base + 1 + x, base + 1 + x + 1)
    }
  }

  return {
    positions: new Float32Array(pos),
    normals: new Float32Array(nrm),
    uvs: new Float32Array(uvArr),
    indices: new Uint32Array(idx),
  }
}
