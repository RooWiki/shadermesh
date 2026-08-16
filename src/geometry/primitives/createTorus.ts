import type { MeshData } from '../../core/MeshData'

export interface TorusParams {
  radius?: number
  tube?: number
  radialSegments?: number
  tubularSegments?: number
  rise?: number
}

export function createTorus(params: TorusParams = {}): MeshData {
  const {
    radius = 0.5,
    tube = 0.2,
    radialSegments = 12,
    tubularSegments = 32,
    rise = 0,
  } = params

  const rs = Math.max(3, Math.round(radialSegments))
  const ts = Math.max(3, Math.round(tubularSegments))

  const pos: number[] = []
  const nrm: number[] = []
  const uvArr: number[] = []
  const idx: number[] = []

  for (let j = 0; j <= rs; j++) {
    const phi = (j / rs) * Math.PI * 2
    const cosPhi = Math.cos(phi), sinPhi = Math.sin(phi)
    for (let i = 0; i <= ts; i++) {
      const theta = (i / ts) * Math.PI * 2
      const cosTheta = Math.cos(theta), sinTheta = Math.sin(theta)
      pos.push(
        (radius + tube * cosPhi) * cosTheta,
        tube * sinPhi + (i / ts) * rise,
        (radius + tube * cosPhi) * sinTheta,
      )
      if (rise === 0) nrm.push(cosPhi * cosTheta, sinPhi, cosPhi * sinTheta)
      uvArr.push(i / ts, j / rs)
    }
  }

  for (let j = 0; j < rs; j++) {
    for (let i = 0; i < ts; i++) {
      const a = j * (ts + 1) + i
      const b = a + 1
      const c = (j + 1) * (ts + 1) + i
      const d = c + 1
      idx.push(a, c, b, b, c, d)
    }
  }

  const result: MeshData = {
    positions: new Float32Array(pos),
    uvs: new Float32Array(uvArr),
    indices: new Uint32Array(idx),
  }
  if (rise === 0) result.normals = new Float32Array(nrm)
  return result
}
