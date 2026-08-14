import type { MeshData } from '../core/MeshData'

export function importOBJ(content: string): MeshData {
  const rawPos: number[] = []
  const rawNor: number[] = []
  const rawUV: number[] = []

  type FV = { vi: number; ti: number | null; ni: number | null }
  const faces: FV[][] = []

  for (const raw of content.split('\n')) {
    const line = raw.trim()
    const p = line.split(/\s+/)
    if (p[0] === 'v') {
      rawPos.push(parseFloat(p[1]), parseFloat(p[2]), parseFloat(p[3]))
    } else if (p[0] === 'vn') {
      rawNor.push(parseFloat(p[1]), parseFloat(p[2]), parseFloat(p[3]))
    } else if (p[0] === 'vt') {
      rawUV.push(parseFloat(p[1]), parseFloat(p[2] ?? '0'))
    } else if (p[0] === 'f') {
      const fvs: FV[] = []
      for (let i = 1; i < p.length; i++) {
        const idx = p[i].split('/')
        const vi = parseInt(idx[0]) - 1
        const ti = idx[1] && idx[1] !== '' ? parseInt(idx[1]) - 1 : null
        const ni = idx[2] && idx[2] !== '' ? parseInt(idx[2]) - 1 : null
        fvs.push({ vi, ti, ni })
      }
      // Fan triangulation for quads / ngons
      for (let i = 1; i < fvs.length - 1; i++)
        faces.push([fvs[0], fvs[i], fvs[i + 1]])
    }
  }

  const hasNormals = rawNor.length > 0
  const hasUVs = rawUV.length > 0

  const vertMap = new Map<string, number>()
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  for (const face of faces) {
    for (const { vi, ti, ni } of face) {
      const key = `${vi}/${ti ?? ''}/${ni ?? ''}`
      let idx = vertMap.get(key)
      if (idx === undefined) {
        idx = positions.length / 3
        vertMap.set(key, idx)
        positions.push(rawPos[vi*3], rawPos[vi*3+1], rawPos[vi*3+2])
        if (hasNormals && ni !== null)
          normals.push(rawNor[ni*3], rawNor[ni*3+1], rawNor[ni*3+2])
        if (hasUVs && ti !== null)
          uvs.push(rawUV[ti*2], rawUV[ti*2+1])
      }
      indices.push(idx)
    }
  }

  return {
    positions: new Float32Array(positions),
    normals:   hasNormals && normals.length > 0 ? new Float32Array(normals) : undefined,
    uvs:       hasUVs && uvs.length > 0         ? new Float32Array(uvs)     : undefined,
    indices:   new Uint32Array(indices),
  }
}
