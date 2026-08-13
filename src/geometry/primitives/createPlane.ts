import type { MeshData } from '../../core/MeshData'

export interface PlaneParams {
  width?: number
  height?: number
  subdivisionsX?: number
  subdivisionsY?: number
}

export function createPlane(params: PlaneParams = {}): MeshData {
  const { width = 1, height = 1, subdivisionsX = 1, subdivisionsY = 1 } = params

  const segX = Math.max(1, Math.round(subdivisionsX))
  const segY = Math.max(1, Math.round(subdivisionsY))

  const vertexCountX = segX + 1
  const vertexCountY = segY + 1
  const vertexCount = vertexCountX * vertexCountY
  const triangleCount = segX * segY * 2
  const indexCount = triangleCount * 3

  const positions = new Float32Array(vertexCount * 3)
  const normals = new Float32Array(vertexCount * 3)
  const uvs = new Float32Array(vertexCount * 2)
  const indices = new Uint32Array(indexCount)

  const halfW = width / 2
  const halfH = height / 2

  for (let y = 0; y < vertexCountY; y++) {
    const v = y / segY
    for (let x = 0; x < vertexCountX; x++) {
      const u = x / segX
      const i = y * vertexCountX + x

      positions[i * 3 + 0] = -halfW + u * width
      positions[i * 3 + 1] = 0
      positions[i * 3 + 2] = -halfH + v * height

      normals[i * 3 + 0] = 0
      normals[i * 3 + 1] = 1
      normals[i * 3 + 2] = 0

      uvs[i * 2 + 0] = u
      uvs[i * 2 + 1] = 1 - v
    }
  }

  let idx = 0
  for (let y = 0; y < segY; y++) {
    for (let x = 0; x < segX; x++) {
      const a = y * vertexCountX + x
      const b = a + 1
      const c = a + vertexCountX
      const d = c + 1

      indices[idx++] = a
      indices[idx++] = c
      indices[idx++] = b

      indices[idx++] = b
      indices[idx++] = c
      indices[idx++] = d
    }
  }

  return { positions, normals, uvs, indices }
}
