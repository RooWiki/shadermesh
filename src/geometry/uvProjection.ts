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
 * Radial (polar) UV projection: U = angle [0,1], V = distance from center [0,1].
 *
 * Two fixes applied via vertex duplication:
 * 1. Center singularity — the fan center vertex is duplicated once per triangle,
 *    each copy gets U = midpoint angle of that triangle so pie-slice divisions
 *    are visible all the way to the center.
 * 2. atan2 seam — any triangle still crossing U=0/1 after fix #1 gets its
 *    minority-side edge vertex duplicated with U±1.
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

  const hiDup = new Map<number, number>()
  const loDup = new Map<number, number>()

  // Wrapped average of two U values in [0,1] — takes the short arc
  const wrapMid = (a: number, b: number): number => {
    let d = b - a
    if (d > 0.5) d -= 1
    if (d < -0.5) d += 1
    let m = a + d / 2
    if (m < 0) m += 1
    if (m > 1) m -= 1
    return m
  }

  const POLE_EPS = 1e-4 // V threshold for "center / pole" vertex
  const triCount = indices.length / 3

  for (let t = 0; t < triCount; t++) {
    const vi = [indices[t * 3], indices[t * 3 + 1], indices[t * 3 + 2]]

    // --- Fix 1: per-triangle center vertex ---
    // Identify pole vertices (V ≈ 0) and edge vertices (V > 0)
    const isPole = vi.map(i => baseV[i] <= POLE_EPS)
    const edgeVi = vi.filter((_, k) => !isPole[k])

    if (isPole.some(Boolean) && edgeVi.length >= 2) {
      const midU = wrapMid(baseU[edgeVi[0]], baseU[edgeVi[1]])
      for (let k = 0; k < 3; k++) {
        if (!isPole[k]) continue
        const origIdx = vi[k]
        const newIdx = posArr.length / 3
        posArr.push(positions[origIdx * 3], positions[origIdx * 3 + 1], positions[origIdx * 3 + 2])
        if (nrmArr && normals) nrmArr.push(normals[origIdx * 3], normals[origIdx * 3 + 1], normals[origIdx * 3 + 2])
        uvUArr.push(midU)
        uvVArr.push(baseV[origIdx])
        extraVertexSources.push(origIdx)
        idxArr[t * 3 + k] = newIdx
      }
    }

    // --- Fix 2: seam crossing ---
    // Read updated U values (after fix 1)
    const cu = [0, 1, 2].map(k => {
      const idx = idxArr[t * 3 + k]
      return idx < vertCount ? baseU[idx] : uvUArr[idx]
    })

    const span = Math.max(...cu) - Math.min(...cu)
    if (span <= 0.5) continue

    const h = cu.map(u => u > 0.5)
    const highCount = h.filter(Boolean).length
    const makeHigh = highCount >= 2

    for (let k = 0; k < 3; k++) {
      const isMinority = makeHigh ? !h[k] : h[k]
      if (!isMinority) continue

      const origIdx = indices[t * 3 + k] // original vertex (before fix 1)
      if (baseV[origIdx] <= POLE_EPS) continue // pole already handled above

      const map = makeHigh ? hiDup : loDup
      if (!map.has(origIdx)) {
        const newIdx = posArr.length / 3
        posArr.push(positions[origIdx * 3], positions[origIdx * 3 + 1], positions[origIdx * 3 + 2])
        if (nrmArr && normals) nrmArr.push(normals[origIdx * 3], normals[origIdx * 3 + 1], normals[origIdx * 3 + 2])
        uvUArr.push(baseU[origIdx] + (makeHigh ? 1 : -1))
        uvVArr.push(baseV[origIdx])
        extraVertexSources.push(origIdx)
        map.set(origIdx, newIdx)
      }
      idxArr[t * 3 + k] = map.get(origIdx)!
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
