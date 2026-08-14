import type { MeshData } from '../../core/MeshData'
import { createCylinder } from './createCylinder'

export interface ConeParams {
  radius?: number
  height?: number
  radialSegments?: number
}

export function createCone(params: ConeParams = {}): MeshData {
  const { radius = 0.5, height = 1, radialSegments = 16 } = params
  return createCylinder({ radiusTop: 0, radiusBottom: radius, height, radialSegments, heightSegments: 1 })
}
