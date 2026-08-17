export type UVProjectionType = 'shape_default' | 'planar' | 'cylindrical' | 'spherical' | 'box' | 'radial'

export interface UVMapConfig {
  projection: UVProjectionType
  scaleX: number
  scaleY: number
  offsetX: number
  offsetY: number
  rotation: number
  flipU: boolean
  flipV: boolean
  swapUV: boolean
}

export function defaultUVMapConfig(): UVMapConfig {
  return { projection: 'shape_default', scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0, rotation: 0, flipU: false, flipV: false, swapUV: false }
}

export function projectUVs(
  positions: Float32Array,
  normals: Float32Array | undefined,
  projection: Exclude<UVProjectionType, 'shape_default'>
): Float32Array {
  const vertCount = positions.length / 3
  const uvs = new Float32Array(vertCount * 2)

  if (projection === 'radial') {
    let maxR = 0
    for (let i = 0; i < vertCount; i++) {
      const x = positions[i * 3], z = positions[i * 3 + 2]
      maxR = Math.max(maxR, Math.sqrt(x * x + z * z))
    }
    if (maxR === 0) maxR = 1
    for (let i = 0; i < vertCount; i++) {
      uvs[i * 2]     = positions[i * 3]     / maxR * 0.5 + 0.5
      uvs[i * 2 + 1] = positions[i * 3 + 2] / maxR * 0.5 + 0.5
    }
    return uvs
  }

  for (let i = 0; i < vertCount; i++) {
    const x = positions[i * 3], y = positions[i * 3 + 1], z = positions[i * 3 + 2]
    let u = 0, v = 0
    switch (projection) {
      case 'planar':
        u = x; v = z
        break
      case 'cylindrical':
        u = Math.atan2(z, x) / (2 * Math.PI) + 0.5
        v = y
        break
      case 'spherical': {
        const r = Math.sqrt(x * x + y * y + z * z) || 1
        u = Math.atan2(z, x) / (2 * Math.PI) + 0.5
        v = Math.acos(Math.max(-1, Math.min(1, y / r))) / Math.PI
        break
      }
      case 'box': {
        const nx = normals ? Math.abs(normals[i * 3]) : 0
        const ny = normals ? Math.abs(normals[i * 3 + 1]) : 1
        const nz = normals ? Math.abs(normals[i * 3 + 2]) : 0
        if (nx >= ny && nx >= nz) { u = z; v = y }
        else if (ny >= nx && ny >= nz) { u = x; v = z }
        else { u = x; v = y }
        break
      }
    }
    uvs[i * 2] = u
    uvs[i * 2 + 1] = v
  }
  return uvs
}

export function applyUVTransforms(baseUVs: Float32Array, config: UVMapConfig): Float32Array {
  const vertCount = baseUVs.length / 2
  const uvs = new Float32Array(vertCount * 2)
  const rad = (config.rotation * Math.PI) / 180
  const cos = Math.cos(rad), sin = Math.sin(rad)
  const doRotate = config.rotation !== 0

  for (let i = 0; i < vertCount; i++) {
    let u = baseUVs[i * 2] * config.scaleX
    let v = baseUVs[i * 2 + 1] * config.scaleY

    if (doRotate) {
      const pu = u - 0.5, pv = v - 0.5
      u = pu * cos - pv * sin + 0.5
      v = pu * sin + pv * cos + 0.5
    }

    u += config.offsetX
    v += config.offsetY
    if (config.flipU) u = 1 - u
    if (config.flipV) v = 1 - v
    if (config.swapUV) { const t = u; u = v; v = t }

    uvs[i * 2] = u
    uvs[i * 2 + 1] = v
  }
  return uvs
}
