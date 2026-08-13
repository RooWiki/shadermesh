import { describe, it, expect } from 'vitest'
import { createPlane } from '../../src/geometry/primitives/createPlane'
import { createCube } from '../../src/geometry/primitives/createCube'
import { createSphere } from '../../src/geometry/primitives/createSphere'
import { getMeshStats } from '../../src/core/MeshData'

describe('createPlane', () => {
  it('creates correct vertex count for default params', () => {
    const mesh = createPlane()
    // 1 subdivision → 2×2 vertices
    expect(mesh.positions.length / 3).toBe(4)
    expect(mesh.indices.length / 3).toBe(2)
  })

  it('creates correct vertex count for subdivided plane', () => {
    const mesh = createPlane({ subdivisionsX: 4, subdivisionsY: 4 })
    const vc = 5 * 5 // (subdX+1) * (subdY+1)
    const tc = 4 * 4 * 2
    expect(mesh.positions.length / 3).toBe(vc)
    expect(mesh.indices.length / 3).toBe(tc)
  })

  it('has normals pointing up (+Y)', () => {
    const mesh = createPlane()
    expect(mesh.normals).toBeDefined()
    // Every normal should be (0, 1, 0)
    for (let i = 0; i < mesh.normals!.length; i += 3) {
      expect(mesh.normals![i]).toBeCloseTo(0)
      expect(mesh.normals![i + 1]).toBeCloseTo(1)
      expect(mesh.normals![i + 2]).toBeCloseTo(0)
    }
  })

  it('has UVs in 0-1 range', () => {
    const mesh = createPlane({ subdivisionsX: 3, subdivisionsY: 3 })
    expect(mesh.uvs).toBeDefined()
    for (let i = 0; i < mesh.uvs!.length; i++) {
      expect(mesh.uvs![i]).toBeGreaterThanOrEqual(0)
      expect(mesh.uvs![i]).toBeLessThanOrEqual(1)
    }
  })

  it('positions lie on the XZ plane (Y = 0)', () => {
    const mesh = createPlane({ width: 2, height: 3, subdivisionsX: 5, subdivisionsY: 5 })
    for (let i = 1; i < mesh.positions.length; i += 3) {
      expect(mesh.positions[i]).toBeCloseTo(0)
    }
  })

  it('respects width and height', () => {
    const mesh = createPlane({ width: 4, height: 6 })
    let minX = Infinity, maxX = -Infinity
    let minZ = Infinity, maxZ = -Infinity
    for (let i = 0; i < mesh.positions.length; i += 3) {
      minX = Math.min(minX, mesh.positions[i])
      maxX = Math.max(maxX, mesh.positions[i])
      minZ = Math.min(minZ, mesh.positions[i + 2])
      maxZ = Math.max(maxZ, mesh.positions[i + 2])
    }
    expect(maxX - minX).toBeCloseTo(4)
    expect(maxZ - minZ).toBeCloseTo(6)
  })
})

describe('createCube', () => {
  it('creates 24 vertices (4 per face × 6 faces)', () => {
    const mesh = createCube()
    expect(mesh.positions.length / 3).toBe(24)
  })

  it('creates 12 triangles (2 per face × 6 faces)', () => {
    const mesh = createCube()
    expect(mesh.indices.length / 3).toBe(12)
  })

  it('has normals for all faces', () => {
    const mesh = createCube()
    expect(mesh.normals).toBeDefined()
    expect(mesh.normals!.length).toBe(24 * 3)
  })

  it('all normals are unit vectors', () => {
    const mesh = createCube()
    for (let i = 0; i < mesh.normals!.length; i += 3) {
      const x = mesh.normals![i], y = mesh.normals![i + 1], z = mesh.normals![i + 2]
      const len = Math.sqrt(x * x + y * y + z * z)
      expect(len).toBeCloseTo(1, 5)
    }
  })

  it('has UVs in 0-1 range', () => {
    const mesh = createCube()
    expect(mesh.uvs).toBeDefined()
    for (let i = 0; i < mesh.uvs!.length; i++) {
      expect(mesh.uvs![i]).toBeGreaterThanOrEqual(0)
      expect(mesh.uvs![i]).toBeLessThanOrEqual(1)
    }
  })

  it('respects custom dimensions', () => {
    const mesh = createCube({ width: 2, height: 4, depth: 1 })
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
    for (let i = 0; i < mesh.positions.length; i += 3) {
      maxX = Math.max(maxX, Math.abs(mesh.positions[i]))
      maxY = Math.max(maxY, Math.abs(mesh.positions[i + 1]))
      maxZ = Math.max(maxZ, Math.abs(mesh.positions[i + 2]))
    }
    expect(maxX).toBeCloseTo(1)   // half of width=2
    expect(maxY).toBeCloseTo(2)   // half of height=4
    expect(maxZ).toBeCloseTo(0.5) // half of depth=1
  })
})

describe('createSphere', () => {
  it('creates vertices on the sphere surface', () => {
    const r = 0.5
    const mesh = createSphere({ radius: r, widthSegments: 8, heightSegments: 6 })
    for (let i = 0; i < mesh.positions.length; i += 3) {
      const x = mesh.positions[i], y = mesh.positions[i + 1], z = mesh.positions[i + 2]
      const dist = Math.sqrt(x * x + y * y + z * z)
      expect(dist).toBeCloseTo(r, 4)
    }
  })

  it('has normals equal to normalized positions for a unit sphere', () => {
    const mesh = createSphere({ radius: 1 })
    expect(mesh.normals).toBeDefined()
    for (let i = 0; i < mesh.normals!.length; i += 3) {
      const nx = mesh.normals![i], ny = mesh.normals![i + 1], nz = mesh.normals![i + 2]
      const px = mesh.positions[i], py = mesh.positions[i + 1], pz = mesh.positions[i + 2]
      expect(nx).toBeCloseTo(px, 4)
      expect(ny).toBeCloseTo(py, 4)
      expect(nz).toBeCloseTo(pz, 4)
    }
  })
})

describe('getMeshStats', () => {
  it('correctly reports plane stats', () => {
    const mesh = createPlane({ subdivisionsX: 10, subdivisionsY: 10 })
    const stats = getMeshStats(mesh)
    expect(stats.vertexCount).toBe(121)   // 11×11
    expect(stats.triangleCount).toBe(200) // 10×10×2
    expect(stats.hasNormals).toBe(true)
    expect(stats.hasUVs).toBe(true)
    expect(stats.hasTangents).toBe(false)
    expect(stats.hasColors).toBe(false)
    expect(stats.bytesPositions).toBe(121 * 3 * 4)
    expect(stats.bytesTotal).toBeGreaterThan(0)
  })
})
