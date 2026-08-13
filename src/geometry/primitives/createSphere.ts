import type { MeshData } from '../../core/MeshData'

export interface SphereParams {
  radius?: number
  widthSegments?: number
  heightSegments?: number
}

export function createSphere(params: SphereParams = {}): MeshData {
  const { radius = 0.5, widthSegments = 16, heightSegments = 12 } = params

  const ws = Math.max(3, widthSegments)
  const hs = Math.max(2, heightSegments)

  const vertexCount = (ws + 1) * (hs + 1)
  const positions = new Float32Array(vertexCount * 3)
  const normals = new Float32Array(vertexCount * 3)
  const uvs = new Float32Array(vertexCount * 2)

  let vi = 0
  for (let y = 0; y <= hs; y++) {
    const phi = (y / hs) * Math.PI
    const sinPhi = Math.sin(phi)
    const cosPhi = Math.cos(phi)
    for (let x = 0; x <= ws; x++) {
      const theta = (x / ws) * Math.PI * 2
      const sinTheta = Math.sin(theta)
      const cosTheta = Math.cos(theta)
      const nx = sinPhi * cosTheta
      const ny = cosPhi
      const nz = sinPhi * sinTheta
      positions[vi * 3 + 0] = nx * radius
      positions[vi * 3 + 1] = ny * radius
      positions[vi * 3 + 2] = nz * radius
      normals[vi * 3 + 0] = nx
      normals[vi * 3 + 1] = ny
      normals[vi * 3 + 2] = nz
      uvs[vi * 2 + 0] = x / ws
      uvs[vi * 2 + 1] = 1 - y / hs
      vi++
    }
  }

  const indexCount = ws * hs * 6
  const indices = new Uint32Array(indexCount)
  let ii = 0
  for (let y = 0; y < hs; y++) {
    for (let x = 0; x < ws; x++) {
      const a = y * (ws + 1) + x
      const b = a + 1
      const c = a + (ws + 1)
      const d = c + 1
      if (y !== 0) {
        indices[ii++] = a
        indices[ii++] = b
        indices[ii++] = c
      }
      if (y !== hs - 1) {
        indices[ii++] = b
        indices[ii++] = d
        indices[ii++] = c
      }
    }
  }

  return { positions, normals, uvs, indices: indices.slice(0, ii) }
}
