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
  projection: Exclude<UVProjectionType, 'shape_default' | 'radial'>,
): Float32Array {
  const vertCount = positions.length / 3
  const uvs = new Float32Array(vertCount * 2)

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

/**
 * Radial (polar) UV projection with seam-fix via vertex duplication.
 * U = angle around Y axis [0,1], V = normalized distance from center [0,1].
 * Triangles crossing the atan2 seam get a duplicate vertex with adjusted U
 * so the GPU interpolates across a tiny gap instead of the full [0,1] width.
 */
export function projectRadialUVsWithSeamFix(
  positions: Float32Array,
  normals: Float32Array | undefined,
  indices: Uint32Array,
): {
  uvs: Float32Array
  positions: Float32Array
  normals: Float32Array | undefined
  indices: Uint32Array
  extraVertexSources: number[]
} {
  const vertCount = positions.length / 3

  let maxR = 0
  for (let i = 0; i < vertCount; i++) {
    const x = positions[i * 3], z = positions[i * 3 + 2]
    maxR = Math.max(maxR, Math.sqrt(x * x + z * z))
  }
  if (maxR === 0) maxR = 1

  const baseU = new Float32Array(vertCount)
  const baseV = new Float32Array(vertCount)
  for (let i = 0; i < vertCount; i++) {
    const x = positions[i * 3], z = positions[i * 3 + 2]
    baseU[i] = Math.atan2(z, x) / (2 * Math.PI) + 0.5
    baseV[i] = Math.sqrt(x * x + z * z) / maxR
  }

  const posArr: number[] = Array.from(positions)
  const nrmArr: number[] | null = normals ? Array.from(normals) : null
  const uvUArr: number[] = Array.from(baseU)
  const uvVArr: number[] = Array.from(baseV)
  const idxArr: number[] = Array.from(indices)
  const extraVertexSources: number[] = []

  // hiDup: original index → new index with U+1 (minority low vertex surrounded by high vertices)
  // loDup: original index → new index with U-1 (minority high vertex surrounded by low vertices)
  const hiDup = new Map<number, number>()
  const loDup = new Map<number, number>()

  const triCount = indices.length / 3
  for (let t = 0; t < triCount; t++) {
    const i0 = indices[t * 3], i1 = indices[t * 3 + 1], i2 = indices[t * 3 + 2]
    const u0 = baseU[i0], u1 = baseU[i1], u2 = baseU[i2]

    if (Math.max(u0, u1, u2) - Math.min(u0, u1, u2) <= 0.5) continue

    const h0 = u0 > 0.5, h1 = u1 > 0.5, h2 = u2 > 0.5
    const highCount = (h0 ? 1 : 0) + (h1 ? 1 : 0) + (h2 ? 1 : 0)
    const makeHigh = highCount >= 2

    const verts = [i0, i1, i2]
    const isHigh = [h0, h1, h2]

    for (let v = 0; v < 3; v++) {
      const isMinority = makeHigh ? !isHigh[v] : isHigh[v]
      if (!isMinority) continue

      const origIdx = verts[v]
      const map = makeHigh ? hiDup : loDup

      if (!map.has(origIdx)) {
        const newIdx = posArr.length / 3
        posArr.push(positions[origIdx * 3], positions[origIdx * 3 + 1], positions[origIdx * 3 + 2])
        if (nrmArr && normals) {
          nrmArr.push(normals[origIdx * 3], normals[origIdx * 3 + 1], normals[origIdx * 3 + 2])
        }
        uvUArr.push(baseU[origIdx] + (makeHigh ? 1 : -1))
        uvVArr.push(baseV[origIdx])
        extraVertexSources.push(origIdx)
        map.set(origIdx, newIdx)
      }

      idxArr[t * 3 + v] = map.get(origIdx)!
    }
  }

  const totalVerts = uvUArr.length
  const uvs = new Float32Array(totalVerts * 2)
  for (let i = 0; i < totalVerts; i++) {
    uvs[i * 2] = uvUArr[i]
    uvs[i * 2 + 1] = uvVArr[i]
  }

  return {
    positions: new Float32Array(posArr),
    normals: nrmArr ? new Float32Array(nrmArr) : undefined,
    uvs,
    indices: new Uint32Array(idxArr),
    extraVertexSources,
  }
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
