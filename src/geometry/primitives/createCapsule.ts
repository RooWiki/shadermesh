import type { MeshData } from '../../core/MeshData'

export interface CapsuleParams {
  radius?: number
  height?: number
  radialSegments?: number
  hemisphereSegments?: number
}

export function createCapsule(params: CapsuleParams = {}): MeshData {
  const {
    radius = 0.4,
    height = 1,
    radialSegments = 16,
    hemisphereSegments = 8,
  } = params

  const rs = Math.max(3, Math.round(radialSegments))
  const hs = Math.max(1, Math.round(hemisphereSegments))
  const halfH = height / 2

  const pos: number[] = []
  const nrm: number[] = []
  const uvArr: number[] = []
  const idx: number[] = []

  // Vertex layout:
  //   Rows 0..hs        — top hemisphere (phi: 0 → π/2)
  //   Row  hs+1         — bottom equator (cylinder end)
  //   Rows hs+2..2*hs+1 — bottom hemisphere interior → south pole (phi: π/2 → π)
  // Total rows = 2*hs + 2  (indices 0 .. 2*hs+1)

  const totalRows = 2 * hs + 2

  for (let i = 0; i < totalRows; i++) {
    let r: number, y: number, nR: number, nY: number

    if (i <= hs) {
      // Top hemisphere
      const phi = (i / hs) * (Math.PI / 2)
      const cosPhi = Math.cos(phi), sinPhi = Math.sin(phi)
      r  = radius * sinPhi
      y  = halfH + radius * cosPhi
      nR = sinPhi
      nY = cosPhi
    } else if (i === hs + 1) {
      // Bottom equator (cylinder bottom ring)
      r = radius; y = -halfH; nR = 1; nY = 0
    } else {
      // Bottom hemisphere (j = 1..hs)
      const j = i - hs - 1
      const phi = (Math.PI / 2) + (j / hs) * (Math.PI / 2)
      const cosPhi = Math.cos(phi), sinPhi = Math.sin(phi)
      r  = radius * sinPhi
      y  = -halfH + radius * cosPhi
      nR = sinPhi
      nY = cosPhi
    }

    const v = i / (totalRows - 1)
    for (let x = 0; x <= rs; x++) {
      const theta = (x / rs) * Math.PI * 2
      const cosT = Math.cos(theta), sinT = Math.sin(theta)
      pos.push(r * cosT, y, r * sinT)
      nrm.push(nR * cosT, nY, nR * sinT)
      uvArr.push(x / rs, v)
    }
  }

  for (let i = 0; i < totalRows - 1; i++) {
    for (let x = 0; x < rs; x++) {
      const a = i * (rs + 1) + x
      const b = a + 1
      const c = a + (rs + 1)
      const d = c + 1
      idx.push(a, b, c, b, d, c)
    }
  }

  return {
    positions: new Float32Array(pos),
    normals: new Float32Array(nrm),
    uvs: new Float32Array(uvArr),
    indices: new Uint32Array(idx),
  }
}
