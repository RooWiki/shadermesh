import type { MeshData } from '../../core/MeshData'

export interface CubeParams {
  width?: number
  height?: number
  depth?: number
}

export function createCube(params: CubeParams = {}): MeshData {
  const { width = 1, height = 1, depth = 1 } = params

  const hw = width / 2
  const hh = height / 2
  const hd = depth / 2

  // Each face: 4 vertices, unique normals/UVs per face
  // 6 faces × 4 vertices = 24 vertices
  const positions = new Float32Array(24 * 3)
  const normals = new Float32Array(24 * 3)
  const uvs = new Float32Array(24 * 2)
  const indices = new Uint32Array(6 * 6) // 6 faces × 2 triangles × 3 indices

  type FaceDef = {
    pos: [number, number, number][]
    normal: [number, number, number]
  }

  const faces: FaceDef[] = [
    // +Y top
    { normal: [0, 1, 0],  pos: [[-hw, hh, hd], [hw, hh, hd], [hw, hh, -hd], [-hw, hh, -hd]] },
    // -Y bottom
    { normal: [0, -1, 0], pos: [[-hw, -hh, -hd], [hw, -hh, -hd], [hw, -hh, hd], [-hw, -hh, hd]] },
    // +Z front
    { normal: [0, 0, 1],  pos: [[-hw, -hh, hd], [hw, -hh, hd], [hw, hh, hd], [-hw, hh, hd]] },
    // -Z back
    { normal: [0, 0, -1], pos: [[hw, -hh, -hd], [-hw, -hh, -hd], [-hw, hh, -hd], [hw, hh, -hd]] },
    // +X right
    { normal: [1, 0, 0],  pos: [[hw, -hh, hd], [hw, -hh, -hd], [hw, hh, -hd], [hw, hh, hd]] },
    // -X left
    { normal: [-1, 0, 0], pos: [[-hw, -hh, -hd], [-hw, -hh, hd], [-hw, hh, hd], [-hw, hh, -hd]] },
  ]

  const faceUVs: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]]

  faces.forEach((face, f) => {
    const base = f * 4
    face.pos.forEach(([x, y, z], v) => {
      const vi = (base + v) * 3
      positions[vi + 0] = x
      positions[vi + 1] = y
      positions[vi + 2] = z
      normals[vi + 0] = face.normal[0]
      normals[vi + 1] = face.normal[1]
      normals[vi + 2] = face.normal[2]
      const ui = (base + v) * 2
      uvs[ui + 0] = faceUVs[v][0]
      uvs[ui + 1] = faceUVs[v][1]
    })

    const ii = f * 6
    indices[ii + 0] = base + 0
    indices[ii + 1] = base + 1
    indices[ii + 2] = base + 2
    indices[ii + 3] = base + 0
    indices[ii + 4] = base + 2
    indices[ii + 5] = base + 3
  })

  return { positions, normals, uvs, indices }
}
